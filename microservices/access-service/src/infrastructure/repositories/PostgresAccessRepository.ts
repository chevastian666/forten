import { Knex } from 'knex';
import { IAccessRepository } from '../../domain/repositories/IAccessRepository';
import { Access } from '../../domain/entities/Access';
import { AccessType, AccessStatus } from '../../domain/value-objects/AccessEnums';
import { AccessPermission } from '../../domain/value-objects/AccessPermission';
import { PIN } from '../../domain/value-objects/PIN';

export class PostgresAccessRepository implements IAccessRepository {
  constructor(private readonly db: Knex) {}

  async create(access: Access): Promise<Access> {
    const [created] = await this.db('accesses')
      .insert(this.toPersistence(access))
      .returning('*');
    
    return this.toDomain(created);
  }

  async update(access: Access): Promise<Access> {
    const [updated] = await this.db('accesses')
      .where({ id: access.id })
      .update(this.toPersistence(access))
      .returning('*');
    
    if (!updated) {
      throw new Error('Access not found');
    }
    
    return this.toDomain(updated);
  }

  async findById(id: string): Promise<Access | null> {
    const access = await this.db('accesses')
      .where({ id })
      .first();
    
    return access ? this.toDomain(access) : null;
  }

  async findByUserId(userId: string): Promise<Access[]> {
    const accesses = await this.db('accesses')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc');
    
    return accesses.map(a => this.toDomain(a));
  }

  async findByBuildingId(buildingId: string): Promise<Access[]> {
    const accesses = await this.db('accesses')
      .where({ building_id: buildingId })
      .orderBy('created_at', 'desc');
    
    return accesses.map(a => this.toDomain(a));
  }

  async findByPIN(pin: string, buildingId: string): Promise<Access | null> {
    const access = await this.db('accesses')
      .where({ 
        pin_value: pin,
        building_id: buildingId,
        status: AccessStatus.ACTIVE
      })
      .whereRaw('(pin_expires_at IS NULL OR pin_expires_at > NOW())')
      .first();
    
    return access ? this.toDomain(access) : null;
  }

  async findActive(userId: string, buildingId: string): Promise<Access[]> {
    const accesses = await this.db('accesses')
      .where({ 
        user_id: userId,
        building_id: buildingId,
        status: AccessStatus.ACTIVE
      })
      .whereRaw('valid_from <= NOW()')
      .whereRaw('(valid_until IS NULL OR valid_until >= NOW())')
      .orderBy('created_at', 'desc');
    
    return accesses.map(a => this.toDomain(a));
  }

  async findExpired(): Promise<Access[]> {
    const accesses = await this.db('accesses')
      .where({ status: AccessStatus.ACTIVE })
      .whereNotNull('valid_until')
      .whereRaw('valid_until < NOW()');
    
    return accesses.map(a => this.toDomain(a));
  }

  async findByStatus(status: AccessStatus): Promise<Access[]> {
    const accesses = await this.db('accesses')
      .where({ status })
      .orderBy('created_at', 'desc');
    
    return accesses.map(a => this.toDomain(a));
  }

  async findByType(type: AccessType): Promise<Access[]> {
    const accesses = await this.db('accesses')
      .where({ access_type: type })
      .orderBy('created_at', 'desc');
    
    return accesses.map(a => this.toDomain(a));
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<Access[]> {
    const accesses = await this.db('accesses')
      .whereBetween('created_at', [startDate, endDate])
      .orderBy('created_at', 'desc');
    
    return accesses.map(a => this.toDomain(a));
  }

  async delete(id: string): Promise<void> {
    const deleted = await this.db('accesses')
      .where({ id })
      .delete();
    
    if (!deleted) {
      throw new Error('Access not found');
    }
  }

  async bulkUpdateStatus(ids: string[], status: AccessStatus): Promise<void> {
    await this.db('accesses')
      .whereIn('id', ids)
      .update({ 
        status,
        updated_at: new Date()
      });
  }

  async bulkDelete(ids: string[]): Promise<void> {
    await this.db('accesses')
      .whereIn('id', ids)
      .delete();
  }

  async countByStatus(buildingId?: string): Promise<Record<AccessStatus, number>> {
    const query = this.db('accesses')
      .select('status')
      .count('* as count')
      .groupBy('status');
    
    if (buildingId) {
      query.where({ building_id: buildingId });
    }
    
    const results = await query;
    
    const counts: Record<AccessStatus, number> = {
      [AccessStatus.ACTIVE]: 0,
      [AccessStatus.SUSPENDED]: 0,
      [AccessStatus.REVOKED]: 0,
      [AccessStatus.EXPIRED]: 0,
      [AccessStatus.PENDING]: 0
    };
    
    results.forEach(r => {
      counts[r.status as AccessStatus] = parseInt(r.count as string);
    });
    
    return counts;
  }

  async countByType(buildingId?: string): Promise<Record<AccessType, number>> {
    const query = this.db('accesses')
      .select('access_type')
      .count('* as count')
      .groupBy('access_type');
    
    if (buildingId) {
      query.where({ building_id: buildingId });
    }
    
    const results = await query;
    
    const counts: Record<AccessType, number> = {
      [AccessType.PERMANENT]: 0,
      [AccessType.TEMPORARY]: 0,
      [AccessType.VISITOR]: 0,
      [AccessType.CONTRACTOR]: 0,
      [AccessType.EMERGENCY]: 0,
      [AccessType.MAINTENANCE]: 0
    };
    
    results.forEach(r => {
      counts[r.access_type as AccessType] = parseInt(r.count as string);
    });
    
    return counts;
  }

  private toPersistence(access: Access): any {
    return {
      id: access.id,
      user_id: access.userId,
      building_id: access.buildingId,
      door_ids: JSON.stringify(access.doorIds),
      pin_value: access.pin?.getValue(),
      pin_expires_at: access.pin?.getExpiresAt(),
      access_type: access.accessType,
      status: access.status,
      permissions: JSON.stringify(access.permissions),
      valid_from: access.validFrom,
      valid_until: access.validUntil,
      is_temporary: access.isTemporary,
      max_usage_count: access.maxUsageCount,
      current_usage_count: access.currentUsageCount,
      metadata: access.metadata ? JSON.stringify(access.metadata) : null,
      created_by: access.createdBy,
      created_at: access.createdAt,
      updated_at: access.updatedAt
    };
  }

  private toDomain(raw: any): Access {
    return Access.create({
      id: raw.id,
      userId: raw.user_id,
      buildingId: raw.building_id,
      doorIds: JSON.parse(raw.door_ids),
      pin: raw.pin_value ? new PIN(raw.pin_value, raw.pin_expires_at) : undefined,
      accessType: raw.access_type,
      status: raw.status,
      permissions: JSON.parse(raw.permissions),
      validFrom: raw.valid_from,
      validUntil: raw.valid_until,
      isTemporary: raw.is_temporary,
      maxUsageCount: raw.max_usage_count,
      currentUsageCount: raw.current_usage_count,
      metadata: raw.metadata ? JSON.parse(raw.metadata) : undefined,
      createdBy: raw.created_by,
      createdAt: raw.created_at,
      updatedAt: raw.updated_at
    });
  }
}