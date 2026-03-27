const db = require('../config/database');
const logger = require('../utils/logger');

class Profile {
  static async create(profileData) {
    try {
      const aiService = require('../services/aiService');
      
      const profile = {
        profile_id: profileData.profileId,
        profile_type: profileData.profileType || 'Guest',
        status_code: profileData.statusCode || 'Active',
        create_date_time: profileData.createDateTime,
        update_date_time: profileData.updateDateTime,
        profile_data: JSON.stringify(profileData),
        keywords: JSON.stringify(profileData.customer?.keywords?.keyword || []),
        has_master_keyword: aiService.hasMasterProfileKeyword(profileData),
        last_synced_at: new Date()
      };

      const [id] = await db('profiles').insert(profile).returning('id');
      
      logger.info(`Profile ${profile.profile_id} created in database with ID: ${id}`);
      return id;
      
    } catch (error) {
      logger.error(`Error creating profile: ${error.message}`);
      throw error;
    }
  }

  static async findByProfileId(profileId) {
    try {
      const profile = await db('profiles').where('profile_id', profileId).first();
      
      if (profile && profile.profile_data) {
        profile.profile_data = JSON.parse(profile.profile_data);
      }
      
      if (profile && profile.keywords) {
        profile.keywords = JSON.parse(profile.keywords);
      }
      
      return profile;
    } catch (error) {
      logger.error(`Error finding profile ${profileId}: ${error.message}`);
      throw error;
    }
  }

  static async update(profileId, updateData) {
    try {
      const aiService = require('../services/aiService');
      
      const updateFields = {
        ...updateData,
        update_date_time: new Date(),
        last_synced_at: new Date()
      };

      if (updateData.profile_data) {
        updateFields.has_master_keyword = aiService.hasMasterProfileKeyword(JSON.parse(updateData.profile_data));
      }

      const updated = await db('profiles')
        .where('profile_id', profileId)
        .update(updateFields);

      logger.info(`Profile ${profileId} updated: ${updated} rows affected`);
      return updated;
      
    } catch (error) {
      logger.error(`Error updating profile ${profileId}: ${error.message}`);
      throw error;
    }
  }

  static async delete(profileId) {
    try {
      const deleted = await db('profiles').where('profile_id', profileId).del();
      
      logger.info(`Profile ${profileId} deleted: ${deleted} rows affected`);
      return deleted;
      
    } catch (error) {
      logger.error(`Error deleting profile ${profileId}: ${error.message}`);
      throw error;
    }
  }

  static async findDuplicates(profileId, threshold = 0.8) {
    try {
      const profile = await this.findByProfileId(profileId);
      if (!profile) {
        throw new Error('Profile not found');
      }

      const candidates = await db('profiles')
        .where('profile_id', '!=', profileId)
        .andWhere('status_code', 'Active')
        .andWhere('profile_type', profile.profile_type);

      const aiService = require('../services/aiService');
      const duplicates = [];

      for (const candidate of candidates) {
        if (candidate.profile_data) {
          candidate.profile_data = JSON.parse(candidate.profile_data);
        }

        const similarity = aiService.calculateProfileSimilarity(
          profile.profile_data,
          candidate.profile_data
        );

        if (similarity.overall >= threshold) {
          duplicates.push({
            profile_id: candidate.profile_id,
            similarity,
            profile_data: candidate.profile_data
          });
        }
      }

      return duplicates.sort((a, b) => b.similarity.overall - a.similarity.overall);
      
    } catch (error) {
      logger.error(`Error finding duplicates for ${profileId}: ${error.message}`);
      throw error;
    }
  }

  static async getMasterProfiles() {
    try {
      const profiles = await db('profiles')
        .where('has_master_keyword', true)
        .andWhere('status_code', 'Active')
        .orderBy('create_date_time', 'asc');

      return profiles.map(profile => {
        if (profile.profile_data) {
          profile.profile_data = JSON.parse(profile.profile_data);
        }
        if (profile.keywords) {
          profile.keywords = JSON.parse(profile.keywords);
        }
        return profile;
      });
      
    } catch (error) {
      logger.error(`Error getting master profiles: ${error.message}`);
      throw error;
    }
  }

  static async getProfilesByType(profileType, limit = 100, offset = 0) {
    try {
      const profiles = await db('profiles')
        .where('profile_type', profileType)
        .andWhere('status_code', 'Active')
        .orderBy('create_date_time', 'desc')
        .limit(limit)
        .offset(offset);

      return profiles.map(profile => {
        if (profile.profile_data) {
          profile.profile_data = JSON.parse(profile.profile_data);
        }
        if (profile.keywords) {
          profile.keywords = JSON.parse(profile.keywords);
        }
        return profile;
      });
      
    } catch (error) {
      logger.error(`Error getting profiles by type ${profileType}: ${error.message}`);
      throw error;
    }
  }

  static async getRecentProfiles(hours = 24, limit = 100) {
    try {
      const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
      
      const profiles = await db('profiles')
        .where('create_date_time', '>=', cutoffTime)
        .orderBy('create_date_time', 'desc')
        .limit(limit);

      return profiles.map(profile => {
        if (profile.profile_data) {
          profile.profile_data = JSON.parse(profile.profile_data);
        }
        if (profile.keywords) {
          profile.keywords = JSON.parse(profile.keywords);
        }
        return profile;
      });
      
    } catch (error) {
      logger.error(`Error getting recent profiles: ${error.message}`);
      throw error;
    }
  }

  static async getStatistics() {
    try {
      const stats = await db('profiles')
        .select(
          db.raw('COUNT(*) as total_profiles'),
          db.raw('COUNT(CASE WHEN has_master_keyword = true THEN 1 END) as master_profiles'),
          db.raw('COUNT(CASE WHEN status_code = \'Active\' THEN 1 END) as active_profiles'),
          db.raw('COUNT(CASE WHEN status_code = \'Inactive\' THEN 1 END) as inactive_profiles'),
          db.raw('profile_type'),
        )
        .groupBy('profile_type');

      const totalStats = await db('profiles')
        .select(
          db.raw('COUNT(*) as total'),
          db.raw('COUNT(CASE WHEN has_master_keyword = true THEN 1 END) as master'),
          db.raw('COUNT(CASE WHEN status_code = \'Active\' THEN 1 END) as active'),
          db.raw('COUNT(CASE WHEN status_code = \'Inactive\' THEN 1 END) as inactive'),
          db.raw('MAX(create_date_time) as latest_profile'),
          db.raw('MIN(create_date_time) as earliest_profile')
        )
        .first();

      return {
        by_type: stats,
        total: totalStats
      };
      
    } catch (error) {
      logger.error(`Error getting profile statistics: ${error.message}`);
      throw error;
    }
  }

  static async syncFromOHIP(profileId) {
    try {
      const ohipService = require('../services/ohipService');
      
      const ohipProfile = await ohipService.getProfile(profileId, [
        'Profile', 'Communication', 'Preference', 'Indicators', 'Membership'
      ]);

      const existing = await this.findByProfileId(profileId);
      
      if (existing) {
        await this.update(profileId, {
          profile_data: JSON.stringify(ohipProfile),
          status_code: ohipProfile.statusCode,
          update_date_time: ohipProfile.updateDateTime
        });
      } else {
        await this.create(ohipProfile);
      }

      logger.info(`Profile ${profileId} synced from OHIP`);
      return ohipProfile;
      
    } catch (error) {
      logger.error(`Error syncing profile ${profileId} from OHIP: ${error.message}`);
      throw error;
    }
  }

  static async search(query) {
    try {
      let dbQuery = db('profiles');

      if (query.profile_type) {
        dbQuery = dbQuery.where('profile_type', query.profile_type);
      }

      if (query.status_code) {
        dbQuery = dbQuery.where('status_code', query.status_code);
      }

      if (query.has_master_keyword !== undefined) {
        dbQuery = dbQuery.where('has_master_keyword', query.has_master_keyword);
      }

      if (query.created_after) {
        dbQuery = dbQuery.where('create_date_time', '>=', new Date(query.created_after));
      }

      if (query.created_before) {
        dbQuery = dbQuery.where('create_date_time', '<=', new Date(query.created_before));
      }

      const limit = parseInt(query.limit) || 100;
      const offset = parseInt(query.offset) || 0;

      const profiles = await dbQuery
        .orderBy('create_date_time', 'desc')
        .limit(limit)
        .offset(offset);

      return profiles.map(profile => {
        if (profile.profile_data) {
          profile.profile_data = JSON.parse(profile.profile_data);
        }
        if (profile.keywords) {
          profile.keywords = JSON.parse(profile.keywords);
        }
        return profile;
      });
      
    } catch (error) {
      logger.error(`Error searching profiles: ${error.message}`);
      throw error;
    }
  }
}

module.exports = Profile;
