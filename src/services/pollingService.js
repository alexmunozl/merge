const cron = require('node-cron');
const ohipService = require('./ohipService');
const aiService = require('./aiService');
const mergeService = require('./mergeService');
const logger = require('../utils/logger');
const config = require('../config');
const settingsService = require('./settingsService');

class PollingService {
  constructor() {
    this.isRunning = false;
    this.lastPollTime = null;
    this.pollingJob = null;
    this.processingQueue = new Map();


// Live apply: restart cron schedule when polling_interval changes
settingsService.on('changed', ({ key }) => {
  if (key !== 'polling_interval') return;
  if (!this.isRunning) return;
  try {
    this.restartSchedule();
  } catch (e) {
    logger.warn(`Failed to restart polling schedule: ${e.message}`);
  }
});
  }

  start() {
    if (this.isRunning) {
      logger.warn('Polling service is already running');
      return;
    }

    logger.info('Starting polling service');
    this.isRunning = true;
    
    const cronExpression = this.getCronExpression();
    logger.info(`Setting up polling with cron expression: ${cronExpression}`);
    
    this.pollingJob = cron.schedule(cronExpression, async () => {
      await this.pollForNewProfiles();
    }, {
      scheduled: false
    });

    this.pollingJob.start();
    
    setTimeout(() => this.pollForNewProfiles(), 5000);
  }

  stop() {
    if (!this.isRunning) {
      logger.warn('Polling service is not running');
      return;
    }

    logger.info('Stopping polling service');
    this.isRunning = false;
    
    if (this.pollingJob) {
      this.pollingJob.stop();
      this.pollingJob = null;
    }
  }

  getCronExpression() {
    const intervalMs = settingsService.getNumber('polling_interval', config.businessRules.pollingInterval);
    const intervalMinutes = Math.floor(intervalMs / 60000);
    
    if (intervalMinutes < 1) {
      return '*/30 * * * * *';
    } else if (intervalMinutes < 60) {
      return `*/${intervalMinutes} * * * *`;
    } else {
      const hours = Math.floor(intervalMinutes / 60);
      return `0 */${hours} * * *`;
    }
  }

  async pollForNewProfiles() {
    if (!this.isRunning) {
      return;
    }

    try {
      logger.info('Starting poll for new profiles');
      const pollStartTime = new Date();
      
      const newProfiles = await this.getNewProfiles(this.lastPollTime);
      
      if (newProfiles.length === 0) {
        logger.info('No new profiles found');
        this.lastPollTime = pollStartTime;
        return;
      }

      logger.info(`Found ${newProfiles.length} new profiles to process`);
      
      await this.processNewProfiles(newProfiles);
      
      this.lastPollTime = pollStartTime;
      
    } catch (error) {
      logger.error(`Error during polling: ${error.message}`);
    }
  }

  async getNewProfiles(sinceTime) {
    try {
      const timestamp = sinceTime ? sinceTime.toISOString() : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const allProfiles = await ohipService.getProfilesCreatedAfter(timestamp, 200);
      
      if (!allProfiles.profiles || !allProfiles.profiles.profile) {
        return [];
      }

      return allProfiles.profiles.profile.filter(profile => {
        const createTime = profile.createDateTime ? new Date(profile.createDateTime) : null;
        return createTime && (!sinceTime || createTime > sinceTime);
      });

    } catch (error) {
      logger.error(`Error fetching new profiles: ${error.message}`);
      throw error;
    }
  }

  async processNewProfiles(newProfiles) {
    const batchSize = config.businessRules.mergeBatchSize;
    const batches = this.createBatches(newProfiles, batchSize);
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      logger.info(`Processing batch ${i + 1}/${batches.length} with ${batch.length} profiles`);
      
      await this.processBatch(batch);
      
      if (i < batches.length - 1) {
        await this.delay(1000);
      }
    }
  }

  createBatches(array, batchSize) {
    const batches = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  async processBatch(profiles) {
    const processingPromises = profiles.map(profile => this.processSingleProfile(profile));
    
    const results = await Promise.allSettled(processingPromises);
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    logger.info(`Batch processing completed: ${successful} successful, ${failed} failed`);
    
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        logger.error(`Profile ${profiles[index].profileId} processing failed: ${result.reason.message}`);
      }
    });
  }

  async processSingleProfile(newProfile) {
    const profileId = newProfile.profileId;
    
    if (this.processingQueue.has(profileId)) {
      logger.info(`Profile ${profileId} is already being processed, skipping`);
      return;
    }

    this.processingQueue.set(profileId, true);
    
    try {
      logger.info(`Processing new profile: ${profileId}`);
      
      if (aiService.hasMasterProfileKeyword(newProfile)) {
        logger.info(`Profile ${profileId} has master profile keyword, skipping duplicate detection`);
        return;
      }

      const potentialDuplicates = await this.findPotentialDuplicates(newProfile);
      
      if (potentialDuplicates.length === 0) {
        logger.info(`No potential duplicates found for profile ${profileId}`);
        return;
      }

      logger.info(`Found ${potentialDuplicates.length} potential duplicates for profile ${profileId}`);
      
      await this.handleDuplicateMatches(newProfile, potentialDuplicates);

    } catch (error) {
      logger.error(`Error processing profile ${profileId}: ${error.message}`);
      throw error;
    } finally {
      this.processingQueue.delete(profileId);
    }
  }

  async findPotentialDuplicates(newProfile) {
    const candidates = [];
    
    const searchStrategies = [
      () => this.searchByName(newProfile),
      () => this.searchByEmail(newProfile),
      () => this.searchByPhone(newProfile),
      () => this.searchByAddress(newProfile)
    ];

    for (const strategy of searchStrategies) {
      try {
        const matches = await strategy();
        candidates.push(...matches);
      } catch (error) {
        logger.warn(`Search strategy failed: ${error.message}`);
      }
    }

    const uniqueCandidates = this.removeDuplicates(candidates, 'profileId');
    
    const potentialDuplicates = [];
    for (const candidate of uniqueCandidates) {
      if (candidate.profileId !== newProfile.profileId) {
        const similarity = aiService.calculateProfileSimilarity(newProfile, candidate);
        if (similarity.overall >= config.ai.confidenceThreshold) {
          potentialDuplicates.push({
            profile: candidate,
            similarity,
            recommendation: aiService.getMergeRecommendation(newProfile, candidate, similarity)
          });
        }
      }
    }

    return potentialDuplicates.sort((a, b) => b.similarity.overall - a.similarity.overall);
  }

  async searchByName(profile) {
    const name = aiService.extractNameParts(profile.customer?.personName || []);
    
    if (!name.surname && !name.givenName) {
      return [];
    }

    const searchParams = {
      profileName: name.surname || '',
      givenName: name.givenName || '',
      profileType: profile.profileType || 'Guest',
      limit: 50
    };

    const response = await ohipService.searchProfiles(searchParams);
    return response.profiles?.profile || [];
  }

  async searchByEmail(profile) {
    const emails = profile.customer?.contactInfo?.email || [];
    
    if (emails.length === 0) {
      return [];
    }

    const allMatches = [];
    
    for (const email of emails) {
      try {
        const response = await ohipService.searchProfilesByEmail(email.emailAddress, profile.profileType);
        allMatches.push(...(response.profiles?.profile || []));
      } catch (error) {
        logger.warn(`Email search failed for ${email.emailAddress}: ${error.message}`);
      }
    }

    return this.removeDuplicates(allMatches, 'profileId');
  }

  async searchByPhone(profile) {
    const phones = profile.customer?.contactInfo?.phone || [];
    
    if (phones.length === 0) {
      return [];
    }

    const allMatches = [];
    
    for (const phone of phones) {
      try {
        const response = await ohipService.searchProfilesByPhone(phone.phoneNumber, profile.profileType);
        allMatches.push(...(response.profiles?.profile || []));
      } catch (error) {
        logger.warn(`Phone search failed for ${phone.phoneNumber}: ${error.message}`);
      }
    }

    return this.removeDuplicates(allMatches, 'profileId');
  }

  async searchByAddress(profile) {
    const addresses = profile.customer?.addresses?.addressInfo || [];
    
    if (addresses.length === 0) {
      return [];
    }

    const allMatches = [];
    
    for (const address of addresses) {
      try {
        const searchParams = {
          city: address.city,
          profileType: profile.profileType,
          limit: 50
        };
        
        const response = await ohipService.searchProfiles(searchParams);
        allMatches.push(...(response.profiles?.profile || []));
      } catch (error) {
        logger.warn(`Address search failed for ${address.city}: ${error.message}`);
      }
    }

    return this.removeDuplicates(allMatches, 'profileId');
  }

  removeDuplicates(array, key) {
    const seen = new Set();
    return array.filter(item => {
      const value = item[key];
      if (seen.has(value)) {
        return false;
      }
      seen.add(value);
      return true;
    });
  }

  async handleDuplicateMatches(newProfile, potentialDuplicates) {
    const topCandidate = potentialDuplicates[0];
    
    if (topCandidate.recommendation.action === 'MERGE_INTO_NEW' || 
        topCandidate.recommendation.action === 'MERGE_INTO_EXISTING') {
      
      try {
        const mergeAnalysis = await mergeService.analyzePotentialMerge(
          newProfile.profileId,
          topCandidate.profile.profileId
        );

        if (mergeAnalysis.recommendation.action === 'AUTO_MERGE') {
          logger.info(`Auto-merging profiles: ${mergeAnalysis.survivorProfileId} <- ${mergeAnalysis.victimProfileId}`);
          
          const result = await mergeService.executeMerge(
            mergeAnalysis.survivorProfileId,
            mergeAnalysis.victimProfileId,
            'auto-polling'
          );
          
          logger.info(`Auto-merge completed: ${JSON.stringify(result)}`);
          
        } else {
          logger.info(`Manual review required for merge: ${newProfile.profileId} <-> ${topCandidate.profile.profileId}`);
          await this.queueForManualReview(newProfile, topCandidate, mergeAnalysis);
        }

      } catch (error) {
        logger.error(`Error handling duplicate match: ${error.message}`);
      }
    } else {
      logger.info(`Manual review required for profile ${newProfile.profileId} with ${potentialDuplicates.length} candidates`);
      await this.queueForManualReview(newProfile, potentialDuplicates);
    }
  }

  async queueForManualReview(newProfile, candidates, mergeAnalysis = null) {
    logger.info(`Queuing profile ${newProfile.profileId} for manual review`);
    
    const reviewData = {
      newProfile,
      candidates,
      mergeAnalysis,
      timestamp: new Date().toISOString(),
      status: 'PENDING_REVIEW'
    };

    try {
      const db = require('../config/database');
      await db('manual_reviews').insert({
        profile_id: newProfile.profileId,
        review_data: JSON.stringify(reviewData),
        status: 'PENDING_REVIEW',
        created_at: new Date()
      });
      
      logger.info(`Profile ${newProfile.profileId} queued for manual review successfully`);
      
    } catch (error) {
      logger.error(`Failed to queue profile for manual review: ${error.message}`);
    }
  }

  async getPollingStatus() {
    return {
      isRunning: this.isRunning,
      lastPollTime: this.lastPollTime,
      processingQueueSize: this.processingQueue.size,
      pollingInterval: config.businessRules.pollingInterval,
      nextPollTime: this.getNextPollTime()
    };
  }

  getNextPollTime() {
    if (!this.isRunning || !this.lastPollTime) {
      return null;
    }
    
    return new Date(this.lastPollTime.getTime() + config.businessRules.pollingInterval);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async manualPoll() {
    logger.info('Manual poll triggered');
    await this.pollForNewProfiles();
  }
}

module.exports = new PollingService();
