import { Pool } from 'pg';
import { ICameraRepository } from '../../domain/repositories/ICameraRepository';
import { Camera, CreateCameraDto, UpdateCameraDto, CameraStatus, CameraCapabilities, VideoQuality } from '../../domain/entities/Camera';
import { Logger } from '../../utils/Logger';

export class PostgreSQLCameraRepository implements ICameraRepository {
  constructor(
    private pool: Pool,
    private logger: Logger
  ) {}

  async create(camera: CreateCameraDto): Promise<Camera> {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO cameras (
          id, building_id, name, model, ip_address, port, username, password,
          location, floor, capabilities, stream_urls, recording, motion_detection,
          status, last_heartbeat, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
          'offline', NOW(), NOW(), NOW()
        )
        RETURNING *
      `;

      const streamUrls = {
        main: `rtsp://${camera.ipAddress}:${camera.port}/main`,
        sub: `rtsp://${camera.ipAddress}:${camera.port}/sub`
      };

      const recording = camera.recording || {
        enabled: false,
        schedule: [],
        retention: 30,
        quality: VideoQuality.MEDIUM
      };

      const motionDetection = camera.motionDetection || {
        enabled: false,
        sensitivity: 50,
        regions: []
      };

      const values = [
        camera.buildingId,
        camera.name,
        camera.model,
        camera.ipAddress,
        camera.port,
        camera.username,
        camera.password,
        camera.location,
        camera.floor,
        JSON.stringify(camera.capabilities),
        JSON.stringify(streamUrls),
        JSON.stringify(recording),
        JSON.stringify(motionDetection)
      ];

      const result = await client.query(query, values);
      const row = result.rows[0];

      this.logger.info(`Camera created: ${row.id}`);
      return this.mapRowToCamera(row);
    } finally {
      client.release();
    }
  }

  async findById(id: string): Promise<Camera | null> {
    const client = await this.pool.connect();
    try {
      const query = 'SELECT * FROM cameras WHERE id = $1';
      const result = await client.query(query, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToCamera(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async findByBuildingId(buildingId: string): Promise<Camera[]> {
    const client = await this.pool.connect();
    try {
      const query = 'SELECT * FROM cameras WHERE building_id = $1 ORDER BY floor, name';
      const result = await client.query(query, [buildingId]);

      return result.rows.map(row => this.mapRowToCamera(row));
    } finally {
      client.release();
    }
  }

  async findByStatus(status: CameraStatus): Promise<Camera[]> {
    const client = await this.pool.connect();
    try {
      const query = 'SELECT * FROM cameras WHERE status = $1 ORDER BY building_id, floor, name';
      const result = await client.query(query, [status]);

      return result.rows.map(row => this.mapRowToCamera(row));
    } finally {
      client.release();
    }
  }

  async findByFloor(buildingId: string, floor: number): Promise<Camera[]> {
    const client = await this.pool.connect();
    try {
      const query = 'SELECT * FROM cameras WHERE building_id = $1 AND floor = $2 ORDER BY name';
      const result = await client.query(query, [buildingId, floor]);

      return result.rows.map(row => this.mapRowToCamera(row));
    } finally {
      client.release();
    }
  }

  async findAll(page = 1, limit = 20): Promise<{ cameras: Camera[]; total: number }> {
    const client = await this.pool.connect();
    try {
      const offset = (page - 1) * limit;

      // Get total count
      const countQuery = 'SELECT COUNT(*) FROM cameras';
      const countResult = await client.query(countQuery);
      const total = parseInt(countResult.rows[0].count);

      // Get cameras
      const query = `
        SELECT * FROM cameras
        ORDER BY building_id, floor, name
        LIMIT $1 OFFSET $2
      `;
      const result = await client.query(query, [limit, offset]);

      const cameras = result.rows.map(row => this.mapRowToCamera(row));

      return { cameras, total };
    } finally {
      client.release();
    }
  }

  async update(id: string, updates: UpdateCameraDto): Promise<Camera | null> {
    const client = await this.pool.connect();
    try {
      const setParts: string[] = [];
      const values: any[] = [];
      let paramIndex = 2; // Start from 2 since $1 is the id

      if (updates.name !== undefined) {
        setParts.push(`name = $${paramIndex++}`);
        values.push(updates.name);
      }

      if (updates.model !== undefined) {
        setParts.push(`model = $${paramIndex++}`);
        values.push(updates.model);
      }

      if (updates.ipAddress !== undefined) {
        setParts.push(`ip_address = $${paramIndex++}`);
        values.push(updates.ipAddress);
      }

      if (updates.port !== undefined) {
        setParts.push(`port = $${paramIndex++}`);
        values.push(updates.port);
      }

      if (updates.username !== undefined) {
        setParts.push(`username = $${paramIndex++}`);
        values.push(updates.username);
      }

      if (updates.password !== undefined) {
        setParts.push(`password = $${paramIndex++}`);
        values.push(updates.password);
      }

      if (updates.location !== undefined) {
        setParts.push(`location = $${paramIndex++}`);
        values.push(updates.location);
      }

      if (updates.floor !== undefined) {
        setParts.push(`floor = $${paramIndex++}`);
        values.push(updates.floor);
      }

      if (updates.status !== undefined) {
        setParts.push(`status = $${paramIndex++}`);
        values.push(updates.status);
      }

      if (updates.capabilities !== undefined) {
        setParts.push(`capabilities = $${paramIndex++}`);
        values.push(JSON.stringify(updates.capabilities));
      }

      if (updates.recording !== undefined) {
        setParts.push(`recording = $${paramIndex++}`);
        values.push(JSON.stringify(updates.recording));
      }

      if (updates.motionDetection !== undefined) {
        setParts.push(`motion_detection = $${paramIndex++}`);
        values.push(JSON.stringify(updates.motionDetection));
      }

      if (setParts.length === 0) {
        return await this.findById(id);
      }

      setParts.push('updated_at = NOW()');

      const query = `
        UPDATE cameras
        SET ${setParts.join(', ')}
        WHERE id = $1
        RETURNING *
      `;

      const result = await client.query(query, [id, ...values]);

      if (result.rows.length === 0) {
        return null;
      }

      this.logger.info(`Camera updated: ${id}`);
      return this.mapRowToCamera(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async delete(id: string): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      const query = 'DELETE FROM cameras WHERE id = $1';
      const result = await client.query(query, [id]);

      const deleted = result.rowCount > 0;
      if (deleted) {
        this.logger.info(`Camera deleted: ${id}`);
      }

      return deleted;
    } finally {
      client.release();
    }
  }

  async updateStatus(id: string, status: CameraStatus): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      const query = `
        UPDATE cameras
        SET status = $1, updated_at = NOW()
        WHERE id = $2
      `;

      const result = await client.query(query, [status, id]);
      return result.rowCount > 0;
    } finally {
      client.release();
    }
  }

  async updateHeartbeat(id: string): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      const query = `
        UPDATE cameras
        SET last_heartbeat = NOW(), updated_at = NOW()
        WHERE id = $1
      `;

      const result = await client.query(query, [id]);
      return result.rowCount > 0;
    } finally {
      client.release();
    }
  }

  async findOfflineCameras(threshold: number): Promise<Camera[]> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT * FROM cameras
        WHERE status = 'online'
        AND last_heartbeat < NOW() - INTERVAL '${threshold} minutes'
        ORDER BY last_heartbeat ASC
      `;

      const result = await client.query(query);
      return result.rows.map(row => this.mapRowToCamera(row));
    } finally {
      client.release();
    }
  }

  async findByHikCentralId(hikCentralId: string): Promise<Camera | null> {
    const client = await this.pool.connect();
    try {
      const query = 'SELECT * FROM cameras WHERE hik_central_id = $1';
      const result = await client.query(query, [hikCentralId]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToCamera(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async bulkUpdateStatus(ids: string[], status: CameraStatus): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      const query = `
        UPDATE cameras
        SET status = $1, updated_at = NOW()
        WHERE id = ANY($2::uuid[])
      `;

      const result = await client.query(query, [status, ids]);
      return result.rowCount > 0;
    } finally {
      client.release();
    }
  }

  private mapRowToCamera(row: any): Camera {
    return {
      id: row.id,
      buildingId: row.building_id,
      name: row.name,
      model: row.model,
      ipAddress: row.ip_address,
      port: row.port,
      username: row.username,
      password: row.password,
      location: row.location,
      floor: row.floor,
      status: row.status as CameraStatus,
      capabilities: JSON.parse(row.capabilities) as CameraCapabilities,
      streamUrls: JSON.parse(row.stream_urls),
      recording: JSON.parse(row.recording),
      motionDetection: JSON.parse(row.motion_detection),
      hikCentralId: row.hik_central_id,
      lastHeartbeat: new Date(row.last_heartbeat),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}