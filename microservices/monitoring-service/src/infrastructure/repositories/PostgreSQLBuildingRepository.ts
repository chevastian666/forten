import { Pool } from 'pg';
import { IBuildingRepository } from '../../domain/repositories/IBuildingRepository';
import { Building, CreateBuildingDto, UpdateBuildingDto, BuildingStatus } from '../../domain/entities/Building';
import { Logger } from '../../utils/Logger';

export class PostgreSQLBuildingRepository implements IBuildingRepository {
  constructor(
    private pool: Pool,
    private logger: Logger
  ) {}

  async create(building: CreateBuildingDto): Promise<Building> {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO buildings (
          id, name, address, manager_id, floors, coordinates, configuration, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), NOW()
        )
        RETURNING *
      `;

      const values = [
        building.name,
        building.address,
        building.managerId,
        building.floors,
        JSON.stringify(building.coordinates),
        JSON.stringify(building.configuration)
      ];

      const result = await client.query(query, values);
      const row = result.rows[0];

      this.logger.info(`Building created: ${row.id}`);
      return this.mapRowToBuilding(row);
    } finally {
      client.release();
    }
  }

  async findById(id: string): Promise<Building | null> {
    const client = await this.pool.connect();
    try {
      const query = 'SELECT * FROM buildings WHERE id = $1';
      const result = await client.query(query, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToBuilding(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async findByManagerId(managerId: string): Promise<Building[]> {
    const client = await this.pool.connect();
    try {
      const query = 'SELECT * FROM buildings WHERE manager_id = $1 ORDER BY created_at DESC';
      const result = await client.query(query, [managerId]);

      return result.rows.map(row => this.mapRowToBuilding(row));
    } finally {
      client.release();
    }
  }

  async findAll(page = 1, limit = 20): Promise<{ buildings: Building[]; total: number }> {
    const client = await this.pool.connect();
    try {
      const offset = (page - 1) * limit;

      // Get total count
      const countQuery = 'SELECT COUNT(*) FROM buildings';
      const countResult = await client.query(countQuery);
      const total = parseInt(countResult.rows[0].count);

      // Get buildings
      const query = `
        SELECT * FROM buildings
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
      `;
      const result = await client.query(query, [limit, offset]);

      const buildings = result.rows.map(row => this.mapRowToBuilding(row));

      return { buildings, total };
    } finally {
      client.release();
    }
  }

  async update(id: string, updates: UpdateBuildingDto): Promise<Building | null> {
    const client = await this.pool.connect();
    try {
      const setParts: string[] = [];
      const values: any[] = [];
      let paramIndex = 2; // Start from 2 since $1 is the id

      if (updates.name !== undefined) {
        setParts.push(`name = $${paramIndex++}`);
        values.push(updates.name);
      }

      if (updates.address !== undefined) {
        setParts.push(`address = $${paramIndex++}`);
        values.push(updates.address);
      }

      if (updates.floors !== undefined) {
        setParts.push(`floors = $${paramIndex++}`);
        values.push(updates.floors);
      }

      if (updates.status !== undefined) {
        setParts.push(`status = $${paramIndex++}`);
        values.push(updates.status);
      }

      if (updates.coordinates !== undefined) {
        setParts.push(`coordinates = $${paramIndex++}`);
        values.push(JSON.stringify(updates.coordinates));
      }

      if (updates.configuration !== undefined) {
        setParts.push(`configuration = $${paramIndex++}`);
        values.push(JSON.stringify(updates.configuration));
      }

      if (setParts.length === 0) {
        return await this.findById(id);
      }

      setParts.push('updated_at = NOW()');

      const query = `
        UPDATE buildings
        SET ${setParts.join(', ')}
        WHERE id = $1
        RETURNING *
      `;

      const result = await client.query(query, [id, ...values]);

      if (result.rows.length === 0) {
        return null;
      }

      this.logger.info(`Building updated: ${id}`);
      return this.mapRowToBuilding(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async delete(id: string): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      const query = 'DELETE FROM buildings WHERE id = $1';
      const result = await client.query(query, [id]);

      const deleted = result.rowCount > 0;
      if (deleted) {
        this.logger.info(`Building deleted: ${id}`);
      }

      return deleted;
    } finally {
      client.release();
    }
  }

  async updateStatus(id: string, status: BuildingStatus): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      const query = `
        UPDATE buildings
        SET status = $1, updated_at = NOW()
        WHERE id = $2
      `;

      const result = await client.query(query, [status, id]);
      return result.rowCount > 0;
    } finally {
      client.release();
    }
  }

  async updateCameraCount(id: string, count: number): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      const query = `
        UPDATE buildings
        SET total_cameras = $1, updated_at = NOW()
        WHERE id = $2
      `;

      const result = await client.query(query, [count, id]);
      return result.rowCount > 0;
    } finally {
      client.release();
    }
  }

  async updateDeviceCount(id: string, count: number): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      const query = `
        UPDATE buildings
        SET total_devices = $1, updated_at = NOW()
        WHERE id = $2
      `;

      const result = await client.query(query, [count, id]);
      return result.rowCount > 0;
    } finally {
      client.release();
    }
  }

  async findByLocation(latitude: number, longitude: number, radius: number): Promise<Building[]> {
    const client = await this.pool.connect();
    try {
      // Using the Haversine formula to find buildings within radius (in kilometers)
      const query = `
        SELECT *, (
          6371 * acos(
            cos(radians($1)) * cos(radians((coordinates->>'latitude')::numeric)) *
            cos(radians((coordinates->>'longitude')::numeric) - radians($2)) +
            sin(radians($1)) * sin(radians((coordinates->>'latitude')::numeric))
          )
        ) AS distance
        FROM buildings
        WHERE coordinates IS NOT NULL
        AND (
          6371 * acos(
            cos(radians($1)) * cos(radians((coordinates->>'latitude')::numeric)) *
            cos(radians((coordinates->>'longitude')::numeric) - radians($2)) +
            sin(radians($1)) * sin(radians((coordinates->>'latitude')::numeric))
          )
        ) <= $3
        ORDER BY distance
      `;

      const result = await client.query(query, [latitude, longitude, radius]);
      return result.rows.map(row => this.mapRowToBuilding(row));
    } finally {
      client.release();
    }
  }

  private mapRowToBuilding(row: any): Building {
    return {
      id: row.id,
      name: row.name,
      address: row.address,
      managerId: row.manager_id,
      floors: row.floors,
      totalCameras: row.total_cameras || 0,
      totalDevices: row.total_devices || 0,
      status: row.status as BuildingStatus,
      coordinates: row.coordinates ? JSON.parse(row.coordinates) : undefined,
      configuration: JSON.parse(row.configuration),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}