/**
 * Migration: Add Full-Text Search Support
 * Creates GIN indexes and search functions for events and logs
 */

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Add search vector columns to events table
      await queryInterface.addColumn('events', 'search_vector', {
        type: 'TSVECTOR',
        allowNull: true
      }, { transaction });

      // Add search vector columns to audit_logs table  
      await queryInterface.addColumn('audit_logs', 'search_vector', {
        type: 'TSVECTOR',
        allowNull: true
      }, { transaction });

      // Create GIN indexes for full-text search
      await queryInterface.sequelize.query(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_search_vector 
        ON events USING GIN(search_vector);
      `, { transaction });

      await queryInterface.sequelize.query(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_search_vector 
        ON audit_logs USING GIN(search_vector);
      `, { transaction });

      // Create search configuration for better Spanish/English support
      await queryInterface.sequelize.query(`
        CREATE TEXT SEARCH CONFIGURATION IF NOT EXISTS forten_search (COPY = pg_catalog.simple);
      `, { transaction });

      // Create function to update search vectors for events
      await queryInterface.sequelize.query(`
        CREATE OR REPLACE FUNCTION update_events_search_vector() 
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.search_vector := 
            setweight(to_tsvector('forten_search', COALESCE(NEW.title, '')), 'A') ||
            setweight(to_tsvector('forten_search', COALESCE(NEW.description, '')), 'B') ||
            setweight(to_tsvector('forten_search', COALESCE(NEW.event_type, '')), 'C') ||
            setweight(to_tsvector('forten_search', COALESCE(NEW.location, '')), 'D') ||
            setweight(to_tsvector('forten_search', COALESCE(NEW.metadata::text, '')), 'D');
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `, { transaction });

      // Create function to update search vectors for audit logs
      await queryInterface.sequelize.query(`
        CREATE OR REPLACE FUNCTION update_audit_logs_search_vector() 
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.search_vector := 
            setweight(to_tsvector('forten_search', COALESCE(NEW.action, '')), 'A') ||
            setweight(to_tsvector('forten_search', COALESCE(NEW.resource, '')), 'B') ||
            setweight(to_tsvector('forten_search', COALESCE(NEW.user_id::text, '')), 'C') ||
            setweight(to_tsvector('forten_search', COALESCE(NEW.ip_address, '')), 'C') ||
            setweight(to_tsvector('forten_search', COALESCE(NEW.user_agent, '')), 'D') ||
            setweight(to_tsvector('forten_search', COALESCE(NEW.changes::text, '')), 'D');
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `, { transaction });

      // Create triggers to automatically update search vectors
      await queryInterface.sequelize.query(`
        DROP TRIGGER IF EXISTS events_search_vector_update ON events;
        CREATE TRIGGER events_search_vector_update 
        BEFORE INSERT OR UPDATE ON events
        FOR EACH ROW EXECUTE FUNCTION update_events_search_vector();
      `, { transaction });

      await queryInterface.sequelize.query(`
        DROP TRIGGER IF EXISTS audit_logs_search_vector_update ON audit_logs;
        CREATE TRIGGER audit_logs_search_vector_update 
        BEFORE INSERT OR UPDATE ON audit_logs
        FOR EACH ROW EXECUTE FUNCTION update_audit_logs_search_vector();
      `, { transaction });

      // Create search ranking function
      await queryInterface.sequelize.query(`
        CREATE OR REPLACE FUNCTION search_rank(
          search_vector tsvector,
          query_text text,
          boost_factor float DEFAULT 1.0
        ) RETURNS float AS $$
        DECLARE
          query_tsquery tsquery;
          base_rank float;
          headline_rank float;
        BEGIN
          -- Convert search text to tsquery
          query_tsquery := plainto_tsquery('forten_search', query_text);
          
          -- Calculate base ranking
          base_rank := ts_rank_cd(search_vector, query_tsquery);
          
          -- Apply boost factor
          RETURN base_rank * boost_factor;
        END;
        $$ LANGUAGE plpgsql;
      `, { transaction });

      // Create search highlight function
      await queryInterface.sequelize.query(`
        CREATE OR REPLACE FUNCTION search_highlight(
          original_text text,
          query_text text,
          max_words integer DEFAULT 35,
          min_words integer DEFAULT 15
        ) RETURNS text AS $$
        DECLARE
          query_tsquery tsquery;
          highlighted text;
        BEGIN
          -- Convert search text to tsquery
          query_tsquery := plainto_tsquery('forten_search', query_text);
          
          -- Generate highlighted snippet
          highlighted := ts_headline(
            'forten_search',
            original_text,
            query_tsquery,
            'StartSel=<mark>,StopSel=</mark>,MaxWords=' || max_words || ',MinWords=' || min_words
          );
          
          RETURN highlighted;
        END;
        $$ LANGUAGE plpgsql;
      `, { transaction });

      // Update existing records to populate search vectors
      await queryInterface.sequelize.query(`
        UPDATE events SET search_vector = 
          setweight(to_tsvector('forten_search', COALESCE(title, '')), 'A') ||
          setweight(to_tsvector('forten_search', COALESCE(description, '')), 'B') ||
          setweight(to_tsvector('forten_search', COALESCE(event_type, '')), 'C') ||
          setweight(to_tsvector('forten_search', COALESCE(location, '')), 'D') ||
          setweight(to_tsvector('forten_search', COALESCE(metadata::text, '')), 'D')
        WHERE search_vector IS NULL;
      `, { transaction });

      await queryInterface.sequelize.query(`
        UPDATE audit_logs SET search_vector = 
          setweight(to_tsvector('forten_search', COALESCE(action, '')), 'A') ||
          setweight(to_tsvector('forten_search', COALESCE(resource, '')), 'B') ||
          setweight(to_tsvector('forten_search', COALESCE(user_id::text, '')), 'C') ||
          setweight(to_tsvector('forten_search', COALESCE(ip_address, '')), 'C') ||
          setweight(to_tsvector('forten_search', COALESCE(user_agent, '')), 'D') ||
          setweight(to_tsvector('forten_search', COALESCE(changes::text, '')), 'D')
        WHERE search_vector IS NULL;
      `, { transaction });

      // Create search statistics table for analytics
      await queryInterface.createTable('search_statistics', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        query_text: {
          type: Sequelize.TEXT,
          allowNull: false
        },
        search_type: {
          type: Sequelize.STRING,
          allowNull: false,
          comment: 'events, audit_logs, or combined'
        },
        results_count: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0
        },
        execution_time_ms: {
          type: Sequelize.FLOAT,
          allowNull: false
        },
        user_id: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        ip_address: {
          type: Sequelize.STRING,
          allowNull: true
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW
        }
      }, { transaction });

      // Create index on search statistics for analytics
      await queryInterface.addIndex('search_statistics', ['query_text'], { 
        name: 'idx_search_statistics_query',
        transaction 
      });
      
      await queryInterface.addIndex('search_statistics', ['created_at'], { 
        name: 'idx_search_statistics_created_at',
        transaction 
      });

      await queryInterface.addIndex('search_statistics', ['search_type'], { 
        name: 'idx_search_statistics_type',
        transaction 
      });

      await transaction.commit();
      
      console.log('✅ Full-text search migration completed successfully');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Full-text search migration failed:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Drop triggers
      await queryInterface.sequelize.query(`
        DROP TRIGGER IF EXISTS events_search_vector_update ON events;
      `, { transaction });

      await queryInterface.sequelize.query(`
        DROP TRIGGER IF EXISTS audit_logs_search_vector_update ON audit_logs;
      `, { transaction });

      // Drop functions
      await queryInterface.sequelize.query(`
        DROP FUNCTION IF EXISTS update_events_search_vector();
      `, { transaction });

      await queryInterface.sequelize.query(`
        DROP FUNCTION IF EXISTS update_audit_logs_search_vector();
      `, { transaction });

      await queryInterface.sequelize.query(`
        DROP FUNCTION IF EXISTS search_rank(tsvector, text, float);
      `, { transaction });

      await queryInterface.sequelize.query(`
        DROP FUNCTION IF EXISTS search_highlight(text, text, integer, integer);
      `, { transaction });

      // Drop indexes
      await queryInterface.sequelize.query(`
        DROP INDEX IF EXISTS idx_events_search_vector;
      `, { transaction });

      await queryInterface.sequelize.query(`
        DROP INDEX IF EXISTS idx_audit_logs_search_vector;
      `, { transaction });

      // Drop search configuration
      await queryInterface.sequelize.query(`
        DROP TEXT SEARCH CONFIGURATION IF EXISTS forten_search;
      `, { transaction });

      // Drop search vector columns
      await queryInterface.removeColumn('events', 'search_vector', { transaction });
      await queryInterface.removeColumn('audit_logs', 'search_vector', { transaction });

      // Drop search statistics table
      await queryInterface.dropTable('search_statistics', { transaction });

      await transaction.commit();
      
      console.log('✅ Full-text search migration rollback completed');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Full-text search migration rollback failed:', error);
      throw error;
    }
  }
};