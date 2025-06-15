import { Pool, PoolClient } from 'pg';
import { BaseStorage, StorageResult, SearchQuery } from './base';
import { DebateDocument, CreateDebateRequest } from '@/types/debate';

export class PostgresStorage extends BaseStorage {
  private pool: Pool;

  constructor() {
    super();
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  async createDebate(request: CreateDebateRequest): Promise<StorageResult<DebateDocument>> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Create the debate document
      const debate: DebateDocument = {
        metadata: {
          id: request.id || this.generateId(),
          version: '1.0',
          topic: request.topic,
          timestamps: {
            created: new Date().toISOString(),
            lastModified: new Date().toISOString(),
            started: request.autoStart ? new Date().toISOString() : undefined,
            completed: undefined
          },
          status: request.autoStart ? 'active' : 'draft',
          format: 'tree',
          configuration: request.configuration || {
            allowObfuscation: false,
            scoringMethod: 'traditional',
            moderationLevel: 'light',
            allowPublicJudging: true,
            economicIncentives: false,
            phaseBasedTiming: false
          },
          access: {
            level: 'public'
          },
          analytics: {
            totalNodes: 1,
            totalParticipants: request.participants.length,
            totalJudgments: 0,
            totalFlags: 0,
            averageDepth: 0,
            longestThread: 0
          }
        },
        participants: this.createParticipantsFromRequest(request.participants),
        nodes: {
          root: {
            id: 'root',
            content: {
              text: request.initialTopic
            },
            participantId: 'system',
            timestamps: {
              created: new Date().toISOString()
            },
            relationships: {
              parents: [],
              children: []
            },
            position: {
              depth: 0,
              threadId: 'main',
              sequenceInThread: 0
            },
            flags: [],
            metrics: {
              wordCount: request.initialTopic.split(' ').length,
              confidenceLevel: 1.0
            },
            version: 1
          }
        },
        rootNodeId: 'root'
      };

      // Insert into database
      await this.insertDebate(client, debate);
      await client.query('COMMIT');

      return { success: true, debate };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating debate:', error);
      return {
        success: false,
        error: {
          code: 'CREATION_FAILED',
          message: 'Failed to create debate'
        }
      };
    } finally {
      client.release();
    }
  }

  async getDebate(id: string): Promise<StorageResult<DebateDocument>> {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(
        'SELECT full_document FROM debates WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Debate not found'
          }
        };
      }

      const debate = result.rows[0].full_document as DebateDocument;
      return { success: true, debate };
    } catch (error) {
      console.error('Error getting debate:', error);
      return {
        success: false,
        error: {
          code: 'RETRIEVAL_FAILED',
          message: 'Failed to retrieve debate'
        }
      };
    } finally {
      client.release();
    }
  }

  async updateDebate(id: string, updates: Partial<DebateDocument>): Promise<StorageResult<DebateDocument>> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get current debate
      const current = await this.getDebate(id);
      if (!current.success || !current.debate) {
        return current;
      }

      // Merge updates
      const updatedDebate: DebateDocument = {
        ...current.debate,
        ...updates,
        metadata: {
          ...current.debate.metadata,
          ...updates.metadata,
          timestamps: {
            ...current.debate.metadata.timestamps,
            ...updates.metadata?.timestamps,
            lastModified: new Date().toISOString()
          }
        }
      };

      // Update in database
      await client.query(
        `UPDATE debates SET 
         title = $2, description = $3, category = $4, tags = $5, status = $6,
         updated_at = $7, configuration = $8, analytics = $9, full_document = $10
         WHERE id = $1`,
        [
          id,
          updatedDebate.metadata.topic.title,
          updatedDebate.metadata.topic.description,
          JSON.stringify(updatedDebate.metadata.topic.tags),
          updatedDebate.metadata.status,
          updatedDebate.metadata.timestamps.lastModified,
          JSON.stringify(updatedDebate.metadata.configuration),
          JSON.stringify(updatedDebate.metadata.analytics),
          JSON.stringify(updatedDebate)
        ]
      );

      await client.query('COMMIT');
      return { success: true, debate: updatedDebate };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error updating debate:', error);
      return {
        success: false,
        error: {
          code: 'UPDATE_FAILED',
          message: 'Failed to update debate'
        }
      };
    } finally {
      client.release();
    }
  }

  async deleteDebate(id: string): Promise<StorageResult<void>> {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query('DELETE FROM debates WHERE id = $1', [id]);
      
      if (result.rowCount === 0) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Debate not found'
          }
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting debate:', error);
      return {
        success: false,
        error: {
          code: 'DELETION_FAILED',
          message: 'Failed to delete debate'
        }
      };
    } finally {
      client.release();
    }
  }

  async searchDebates(query: SearchQuery): Promise<StorageResult<{ debates: DebateDocument[], pagination: any }>> {
    const client = await this.pool.connect();
    
    try {
      let whereClause = '1=1';
      const params: any[] = [];
      let paramCount = 0;

      // Text search
      if (query.text) {
        paramCount++;
        whereClause += ` AND (
          to_tsvector('english', title || ' ' || COALESCE(description, '')) @@ plainto_tsquery('english', $${paramCount})
          OR title ILIKE $${paramCount + 1}
          OR description ILIKE $${paramCount + 1}
        )`;
        params.push(query.text, `%${query.text}%`);
        paramCount++;
      }

      // Status filter
      if (query.status && query.status.length > 0) {
        paramCount++;
        whereClause += ` AND status = ANY($${paramCount})`;
        params.push(query.status);
      }

      // Date range
      if (query.dateRange && query.dateRange.length === 2) {
        paramCount++;
        whereClause += ` AND created_at >= $${paramCount}`;
        params.push(query.dateRange[0]);
        
        paramCount++;
        whereClause += ` AND created_at <= $${paramCount}`;
        params.push(query.dateRange[1]);
      }

      // Sorting
      let orderClause = 'ORDER BY created_at DESC';
      if (query.sortBy) {
        const sortField = query.sortBy === 'created' ? 'created_at' : 
                         query.sortBy === 'updated' ? 'updated_at' : 
                         query.sortBy === 'title' ? 'title' : 'created_at';
        const sortOrder = query.sortOrder === 'asc' ? 'ASC' : 'DESC';
        orderClause = `ORDER BY ${sortField} ${sortOrder}`;
      }

      // Pagination
      const limit = query.limit || 10;
      const offset = query.offset || 0;
      
      paramCount++;
      const limitClause = `LIMIT $${paramCount}`;
      params.push(limit);
      
      paramCount++;
      const offsetClause = `OFFSET $${paramCount}`;
      params.push(offset);

      // Execute query
      const sql = `
        SELECT full_document, created_at
        FROM debates 
        WHERE ${whereClause} 
        ${orderClause} 
        ${limitClause} 
        ${offsetClause}
      `;

      const result = await client.query(sql, params);
      
      // Get total count for pagination
      const countSql = `SELECT COUNT(*) as total FROM debates WHERE ${whereClause}`;
      const countResult = await client.query(countSql, params.slice(0, -2)); // Remove limit/offset params
      
      const debates = result.rows.map(row => row.full_document as DebateDocument);
      const total = parseInt(countResult.rows[0].total);

      return {
        success: true,
        debates,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      };
    } catch (error) {
      console.error('Error searching debates:', error);
      return {
        success: false,
        error: {
          code: 'SEARCH_FAILED',
          message: 'Failed to search debates'
        }
      };
    } finally {
      client.release();
    }
  }

  private async insertDebate(client: PoolClient, debate: DebateDocument): Promise<void> {
    // Insert main debate record
    await client.query(`
      INSERT INTO debates (
        id, version, title, description, category, tags, status, format,
        created_at, updated_at, started_at, completed_at,
        configuration, access_level, analytics, original_platform,
        root_node_id, full_document
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
    `, [
      debate.metadata.id,
      debate.metadata.version,
      debate.metadata.topic.title,
      debate.metadata.topic.description,
      debate.metadata.topic.category,
      JSON.stringify(debate.metadata.topic.tags),
      debate.metadata.status,
      debate.metadata.format,
      debate.metadata.timestamps.created,
      debate.metadata.timestamps.lastModified,
      debate.metadata.timestamps.started,
      debate.metadata.timestamps.completed,
      JSON.stringify(debate.metadata.configuration),
      debate.metadata.access.level,
      JSON.stringify(debate.metadata.analytics),
      JSON.stringify(debate.originalPlatform),
      debate.rootNodeId,
      JSON.stringify(debate)
    ]);

    // Insert participants
    for (const participant of Object.values(debate.participants)) {
      if (participant.type === 'human') {
        await client.query(`
          INSERT INTO debate_participants (
            debate_id, participant_id, name, role, type, side
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          debate.metadata.id,
          participant.id,
          participant.name,
          participant.role,
          participant.type,
          participant.side
        ]);
      }
    }

    // Insert nodes
    for (const node of Object.values(debate.nodes)) {
      const content = node.content?.text || '';
      const parentNodeId = node.relationships?.parents?.[0]?.targetNodeId || null;
      
      await client.query(`
        INSERT INTO debate_nodes (
          debate_id, node_id, participant_id, content, parent_node_id,
          depth, thread_id, sequence_in_thread, word_count, confidence_level, node_data
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        debate.metadata.id,
        node.id,
        node.participantId,
        content,
        parentNodeId,
        node.position?.depth || 0,
        node.position?.threadId,
        node.position?.sequenceInThread || 0,
        node.metrics?.wordCount || content.split(' ').length,
        node.metrics?.confidenceLevel,
        JSON.stringify(node)
      ]);
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}