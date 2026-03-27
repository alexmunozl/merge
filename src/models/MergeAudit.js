const db = require('../config/database');
const logger = require('../utils/logger');

class MergeAudit {
  static async create(mergeData) {
    try {
      const audit = {
        survivor_profile_id: mergeData.survivorProfileId,
        victim_profile_id: mergeData.victimProfileId,
        similarity_score: mergeData.similarity?.overall,
        similarity_details: JSON.stringify(mergeData.similarity),
        merge_analysis: JSON.stringify(mergeData.mergeAnalysis),
        merge_decision: mergeData.decision || 'PENDING',
        merge_status: mergeData.status || 'PENDING',
        executed_by: mergeData.executedBy || null,
        notes: mergeData.notes || null,
        merge_timestamp: mergeData.mergeTimestamp || null,
        merge_result: mergeData.mergeResult ? JSON.stringify(mergeData.mergeResult) : null
      };

      const [id] = await db('merge_audit').insert(audit).returning('id');
      
      logger.info(`Merge audit created with ID: ${id} for ${mergeData.survivorProfileId} <- ${mergeData.victimProfileId}`);
      return id;
      
    } catch (error) {
      logger.error(`Error creating merge audit: ${error.message}`);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const audit = await db('merge_audit').where('id', id).first();
      
      if (audit) {
        if (audit.similarity_details) {
          audit.similarity_details = JSON.parse(audit.similarity_details);
        }
        if (audit.merge_analysis) {
          audit.merge_analysis = JSON.parse(audit.merge_analysis);
        }
        if (audit.merge_result) {
          audit.merge_result = JSON.parse(audit.merge_result);
        }
      }
      
      return audit;
    } catch (error) {
      logger.error(`Error finding merge audit ${id}: ${error.message}`);
      throw error;
    }
  }

  static async findByProfileId(profileId) {
    try {
      const audits = await db('merge_audit')
        .where('survivor_profile_id', profileId)
        .orWhere('victim_profile_id', profileId)
        .orderBy('created_at', 'desc');

      return audits.map(audit => {
        if (audit.similarity_details) {
          audit.similarity_details = JSON.parse(audit.similarity_details);
        }
        if (audit.merge_analysis) {
          audit.merge_analysis = JSON.parse(audit.merge_analysis);
        }
        if (audit.merge_result) {
          audit.merge_result = JSON.parse(audit.merge_result);
        }
        return audit;
      });
    } catch (error) {
      logger.error(`Error finding merge audits for profile ${profileId}: ${error.message}`);
      throw error;
    }
  }

  static async updateStatus(id, status, additionalData = {}) {
    try {
      const updateData = {
        merge_status: status,
        updated_at: new Date(),
        ...additionalData
      };

      if (additionalData.mergeResult) {
        updateData.merge_result = JSON.stringify(additionalData.mergeResult);
      }

      if (additionalData.mergeTimestamp) {
        updateData.merge_timestamp = additionalData.mergeTimestamp;
      }

      const updated = await db('merge_audit')
        .where('id', id)
        .update(updateData);

      logger.info(`Merge audit ${id} status updated to ${status}`);
      return updated;
      
    } catch (error) {
      logger.error(`Error updating merge audit ${id}: ${error.message}`);
      throw error;
    }
  }

  static async getPendingMerges(limit = 100) {
    try {
      const audits = await db('merge_audit')
        .where('merge_status', 'PENDING')
        .orderBy('created_at', 'asc')
        .limit(limit);

      return audits.map(audit => {
        if (audit.similarity_details) {
          audit.similarity_details = JSON.parse(audit.similarity_details);
        }
        if (audit.merge_analysis) {
          audit.merge_analysis = JSON.parse(audit.merge_analysis);
        }
        if (audit.merge_result) {
          audit.merge_result = JSON.parse(audit.merge_result);
        }
        return audit;
      });
    } catch (error) {
      logger.error(`Error getting pending merges: ${error.message}`);
      throw error;
    }
  }

  static async getMergeHistory(filters = {}) {
    try {
      let query = db('merge_audit');

      if (filters.status) {
        query = query.where('merge_status', filters.status);
      }

      if (filters.executed_by) {
        query = query.where('executed_by', filters.executed_by);
      }

      if (filters.date_from) {
        query = query.where('created_at', '>=', new Date(filters.date_from));
      }

      if (filters.date_to) {
        query = query.where('created_at', '<=', new Date(filters.date_to));
      }

      if (filters.min_similarity) {
        query = query.where('similarity_score', '>=', filters.min_similarity);
      }

      const limit = parseInt(filters.limit) || 100;
      const offset = parseInt(filters.offset) || 0;

      const audits = await query
        .orderBy('created_at', 'desc')
        .limit(limit)
        .offset(offset);

      return audits.map(audit => {
        if (audit.similarity_details) {
          audit.similarity_details = JSON.parse(audit.similarity_details);
        }
        if (audit.merge_analysis) {
          audit.merge_analysis = JSON.parse(audit.merge_analysis);
        }
        if (audit.merge_result) {
          audit.merge_result = JSON.parse(audit.merge_result);
        }
        return audit;
      });
    } catch (error) {
      logger.error(`Error getting merge history: ${error.message}`);
      throw error;
    }
  }

  static async getStatistics(filters = {}) {
    try {
      let baseQuery = db('merge_audit');

      if (filters.date_from) {
        baseQuery = baseQuery.where('created_at', '>=', new Date(filters.date_from));
      }

      if (filters.date_to) {
        baseQuery = baseQuery.where('created_at', '<=', new Date(filters.date_to));
      }

      const stats = await baseQuery
        .select(
          db.raw('COUNT(*) as total_merges'),
          db.raw('COUNT(CASE WHEN merge_status = \'COMPLETED\' THEN 1 END) as completed_merges'),
          db.raw('COUNT(CASE WHEN merge_status = \'FAILED\' THEN 1 END) as failed_merges'),
          db.raw('COUNT(CASE WHEN merge_status = \'PENDING\' THEN 1 END) as pending_merges'),
          db.raw('AVG(similarity_score) as avg_similarity_score'),
          db.raw('MAX(similarity_score) as max_similarity_score'),
          db.raw('MIN(similarity_score) as min_similarity_score')
        )
        .first();

      const byDecision = await baseQuery
        .select('merge_decision')
        .count('* as count')
        .groupBy('merge_decision');

      const byExecutedBy = await baseQuery
        .select('executed_by')
        .count('* as count')
        .whereNotNull('executed_by')
        .groupBy('executed_by');

      const dailyStats = await baseQuery
        .select(
          db.raw('DATE(created_at) as date'),
          db.raw('COUNT(*) as total'),
          db.raw('COUNT(CASE WHEN merge_status = \'COMPLETED\' THEN 1 END) as completed')
        )
        .groupBy(db.raw('DATE(created_at)'))
        .orderBy('date', 'desc')
        .limit(30);

      return {
        overall: stats,
        by_decision: byDecision,
        by_executed_by: byExecutedBy,
        daily: dailyStats
      };
    } catch (error) {
      logger.error(`Error getting merge statistics: ${error.message}`);
      throw error;
    }
  }

  static async getRecentMerges(hours = 24, limit = 50) {
    try {
      const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
      
      const audits = await db('merge_audit')
        .where('created_at', '>=', cutoffTime)
        .orderBy('created_at', 'desc')
        .limit(limit);

      return audits.map(audit => {
        if (audit.similarity_details) {
          audit.similarity_details = JSON.parse(audit.similarity_details);
        }
        if (audit.merge_analysis) {
          audit.merge_analysis = JSON.parse(audit.merge_analysis);
        }
        if (audit.merge_result) {
          audit.merge_result = JSON.parse(audit.merge_result);
        }
        return audit;
      });
    } catch (error) {
      logger.error(`Error getting recent merges: ${error.message}`);
      throw error;
    }
  }

  static async getFailedMerges(limit = 100) {
    try {
      const audits = await db('merge_audit')
        .where('merge_status', 'FAILED')
        .orderBy('created_at', 'desc')
        .limit(limit);

      return audits.map(audit => {
        if (audit.similarity_details) {
          audit.similarity_details = JSON.parse(audit.similarity_details);
        }
        if (audit.merge_analysis) {
          audit.merge_analysis = JSON.parse(audit.merge_analysis);
        }
        if (audit.merge_result) {
          audit.merge_result = JSON.parse(audit.merge_result);
        }
        return audit;
      });
    } catch (error) {
      logger.error(`Error getting failed merges: ${error.message}`);
      throw error;
    }
  }

  static async delete(id) {
    try {
      const deleted = await db('merge_audit').where('id', id).del();
      
      logger.info(`Merge audit ${id} deleted: ${deleted} rows affected`);
      return deleted;
      
    } catch (error) {
      logger.error(`Error deleting merge audit ${id}: ${error.message}`);
      throw error;
    }
  }
}

module.exports = MergeAudit;
