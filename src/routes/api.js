const express = require('express');
const Joi = require('joi');
const ohipService = require('../services/ohipService');
const aiService = require('../services/aiService');
const mergeService = require('../services/mergeService');
const pollingService = require('../services/pollingService');
const Profile = require('../models/Profile');
const MergeAudit = require('../models/MergeAudit');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * @swagger
 * /api/profiles/search:
 *   post:
 *     summary: Search for profiles
 *     tags: [Profiles]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               profileName:
 *                 type: string
 *               givenName:
 *                 type: string
 *               email:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               profileType:
 *                 type: string
 *                 enum: [Guest, Agent, Company, Group, Source]
 *               limit:
 *                 type: integer
 *                 default: 200
 *     responses:
 *       200:
 *         description: Search results
 */
router.post('/profiles/search', async (req, res) => {
  try {
    const schema = Joi.object({
      profileName: Joi.string().optional(),
      givenName: Joi.string().optional(),
      email: Joi.string().email().optional(),
      phoneNumber: Joi.string().optional(),
      profileType: Joi.string().optional(),
      limit: Joi.number().integer().max(200).default(200)
    });

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: 'survivorProfileId/victimProfileId (or masterProfileId/duplicateProfileId) are required' });
    }

    let results;
    if (value.email) {
      results = await ohipService.searchProfilesByEmail(value.email, value.profileType);
    } else if (value.phoneNumber) {
      results = await ohipService.searchProfilesByPhone(value.phoneNumber, value.profileType);
    } else if (value.profileName || value.givenName) {
      results = await ohipService.searchProfilesByName(value.profileName, value.givenName, value.profileType);
    } else {
      results = await ohipService.searchProfiles(value);
    }

    res.json(results);
  } catch (error) {
    logger.error(`Profile search error: ${error.message}`);
    res.status(500).json({ error: 'Search failed', message: error.message });
  }
});

/**
 * @swagger
 * /api/profiles/{profileId}:
 *   get:
 *     summary: Get profile by ID
 *     tags: [Profiles]
 *     parameters:
 *       - in: path
 *         name: profileId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Profile details
 */
router.get('/profiles/:profileId', async (req, res) => {
  try {
    const { profileId } = req.params;
    const profile = await ohipService.getProfile(profileId, ['Profile', 'Communication', 'Preference', 'Indicators', 'Membership']);
    
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json(profile);
  } catch (error) {
    logger.error(`Get profile error: ${error.message}`);
    res.status(500).json({ error: 'Failed to get profile', message: error.message });
  }
});

/**
 * @swagger
 * /api/profiles/{profileId}/duplicates:
 *   get:
 *     summary: Find potential duplicates for a profile
 *     tags: [Profiles]
 *     parameters:
 *       - in: path
 *         name: profileId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: threshold
 *         schema:
 *           type: number
 *           default: 0.8
 *     responses:
 *       200:
 *         description: Potential duplicates
 */
router.get('/profiles/:profileId/duplicates', async (req, res) => {
  try {
    const { profileId } = req.params;
    const threshold = parseFloat(req.query.threshold) || 0.8;

    const profile = await ohipService.getProfile(profileId);
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const candidates = [];
    
    const searchStrategies = [
      () => ohipService.searchProfilesByName(profile.customer?.personName?.[0]?.surname, profile.customer?.personName?.[0]?.givenName, profile.profileType),
      () => ohipService.searchProfilesByEmail(profile.customer?.contactInfo?.email?.[0]?.emailAddress, profile.profileType),
      () => ohipService.searchProfilesByPhone(profile.customer?.contactInfo?.phone?.[0]?.phoneNumber, profile.profileType)
    ];

    for (const strategy of searchStrategies) {
      try {
        const results = await strategy();
        candidates.push(...(results.profiles?.profile || []));
      } catch (error) {
        logger.warn(`Search strategy failed: ${error.message}`);
      }
    }

    const uniqueCandidates = candidates.filter((candidate, index, self) => 
      index === self.findIndex(c => c.profileId === candidate.profileId) && candidate.profileId !== profileId
    );

    const duplicates = [];
    for (const candidate of uniqueCandidates) {
      const similarity = aiService.calculateProfileSimilarity(profile, candidate);
      if (similarity.overall >= threshold) {
        duplicates.push({
          profile: candidate,
          similarity,
          recommendation: aiService.getMergeRecommendation(profile, candidate, similarity)
        });
      }
    }

    const sortedDuplicates = duplicates.sort((a, b) => b.similarity.overall - a.similarity.overall);

    res.json({
      profileId,
      threshold,
      duplicates: sortedDuplicates,
      totalFound: sortedDuplicates.length
    });
  } catch (error) {
    logger.error(`Find duplicates error: ${error.message}`);
    res.status(500).json({ error: 'Failed to find duplicates', message: error.message });
  }
});

/**
 * @swagger
 * /api/merges/analyze:
 *   post:
 *     summary: Analyze potential merge between two profiles
 *     tags: [Merges]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - survivorProfileId
 *               - victimProfileId
 *             properties:
 *               survivorProfileId:
 *                 type: string
 *               victimProfileId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Merge analysis
 */
router.post('/merges/analyze', async (req, res) => {
  try {
const schema = Joi.object({
  survivorProfileId: Joi.string().optional(),
  victimProfileId: Joi.string().optional(),
  masterProfileId: Joi.string().optional(),
  duplicateProfileId: Joi.string().optional()
}).custom((obj, helpers) => {
  const survivor = obj.survivorProfileId || obj.masterProfileId;
  const victim = obj.victimProfileId || obj.duplicateProfileId;
  if (!survivor || !victim) return helpers.error('any.invalid');
  return { survivorProfileId: survivor, victimProfileId: victim };
}, 'merge id mapping');

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: 'survivorProfileId/victimProfileId (or masterProfileId/duplicateProfileId) are required' });
    }

    const analysis = await mergeService.analyzePotentialMerge(
      value.survivorProfileId,
      value.victimProfileId
    );

    await MergeAudit.create({
      survivorProfileId: value.survivorProfileId,
      victimProfileId: value.victimProfileId,
      similarity: analysis.similarity,
      mergeAnalysis: analysis.mergeAnalysis,
      decision: analysis.recommendation.action,
      status: 'PENDING',
      notes: analysis.recommendation.reason
    });

    res.json(analysis);
  } catch (error) {
    logger.error(`Merge analysis error: ${error.message}`);
    res.status(500).json({ error: 'Merge analysis failed', message: error.message });
  }
});

/**
 * @swagger
 * /api/merges/execute:
 *   post:
 *     summary: Execute merge between two profiles
 *     tags: [Merges]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - survivorProfileId
 *               - victimProfileId
 *             properties:
 *               survivorProfileId:
 *                 type: string
 *               victimProfileId:
 *                 type: string
 *               executedBy:
 *                 type: string
 *     responses:
 *       200:
 *         description: Merge executed
 */
router.post('/merges/execute', async (req, res) => {
  try {
const schema = Joi.object({
  survivorProfileId: Joi.string().optional(),
  victimProfileId: Joi.string().optional(),
  masterProfileId: Joi.string().optional(),
  duplicateProfileId: Joi.string().optional(),
  executedBy: Joi.string().default('manual')
}).custom((obj, helpers) => {
  const survivor = obj.survivorProfileId || obj.masterProfileId;
  const victim = obj.victimProfileId || obj.duplicateProfileId;
  if (!survivor || !victim) return helpers.error('any.invalid');
  return { survivorProfileId: survivor, victimProfileId: victim, executedBy: obj.executedBy };
}, 'merge id mapping');

    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: 'survivorProfileId/victimProfileId (or masterProfileId/duplicateProfileId) are required' });
    }

    const validation = await mergeService.validateMergePreconditions(
      value.survivorProfileId,
      value.victimProfileId
    );

    if (!validation.isValid) {
      return res.status(400).json({ 
        error: 'Merge validation failed', 
        errors: validation.errors,
        warnings: validation.warnings
      });
    }

    const result = await mergeService.executeMerge(
      value.survivorProfileId,
      value.victimProfileId,
      value.executedBy
    );

    const auditId = await MergeAudit.create({
      survivorProfileId: value.survivorProfileId,
      victimProfileId: value.victimProfileId,
      status: 'COMPLETED',
      executedBy: value.executedBy,
      mergeTimestamp: result.timestamp,
      mergeResult: result.mergeResult
    });

    if (global.io) {
      global.io.emit('merge_completed', {
        auditId,
        survivorProfileId: value.survivorProfileId,
        victimProfileId: value.victimProfileId,
        executedBy: value.executedBy,
        timestamp: result.timestamp
      });
    }

    res.json({
      success: true,
      auditId,
      result
    });
  } catch (error) {
    logger.error(`Merge execution error: ${error.message}`);
    
    try {
      await MergeAudit.create({
        survivorProfileId: req.body.survivorProfileId,
        victimProfileId: req.body.victimProfileId,
        status: 'FAILED',
        executedBy: req.body.executedBy || 'manual',
        notes: error.message
      });
    } catch (auditError) {
      logger.error(`Failed to create audit record: ${auditError.message}`);
    }

    res.status(500).json({ error: 'Merge execution failed', message: error.message });
  }
});

/**
 * @swagger
 * /api/merges/snapshot:
 *   get:
 *     summary: Get merge snapshot
 *     tags: [Merges]
 *     parameters:
 *       - in: query
 *         name: survivorProfileId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: victimProfileId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Merge snapshot
 */
router.get('/merges/snapshot', async (req, res) => {
  try {
    const { survivorProfileId, victimProfileId } = req.query;
    
    if (!survivorProfileId || !victimProfileId) {
      return res.status(400).json({ error: 'Both survivorProfileId and victimProfileId are required' });
    }

    const snapshot = await mergeService.getMergeSnapshot(survivorProfileId, [victimProfileId]);
    
    res.json(snapshot);
  } catch (error) {
    logger.error(`Get merge snapshot error: ${error.message}`);
    res.status(500).json({ error: 'Failed to get merge snapshot', message: error.message });
  }
});

/**
 * @swagger
 * /api/merges/history:
 *   get:
 *     summary: Get merge history
 *     tags: [Merges]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Merge history
 */
router.get('/merges/history', async (req, res) => {
  try {
    const filters = {
      limit: parseInt(req.query.limit) || 100,
      offset: parseInt(req.query.offset) || 0,
      status: req.query.status,
      date_from: req.query.dateFrom,
      date_to: req.query.dateTo
    };

    const history = await MergeAudit.getMergeHistory(filters);
    
    res.json({
      merges: history,
      filters
    });
  } catch (error) {
    logger.error(`Get merge history error: ${error.message}`);
    res.status(500).json({ error: 'Failed to get merge history', message: error.message });
  }
});

/**
 * @swagger
 * /api/merges/statistics:
 *   get:
 *     summary: Get merge statistics
 *     tags: [Merges]
 *     responses:
 *       200:
 *         description: Merge statistics
 */
router.get('/merges/statistics', async (req, res) => {
  try {
    const filters = {
      date_from: req.query.dateFrom,
      date_to: req.query.dateTo
    };

    const stats = await MergeAudit.getStatistics(filters);
    
    res.json(stats);
  } catch (error) {
    logger.error(`Get merge statistics error: ${error.message}`);
    res.status(500).json({ error: 'Failed to get merge statistics', message: error.message });
  }
});

/**
 * @swagger
 * /api/polling/status:
 *   get:
 *     summary: Get polling service status
 *     tags: [Polling]
 *     responses:
 *       200:
 *         description: Polling status
 */
router.get('/polling/status', async (req, res) => {
  try {
    const status = await pollingService.getPollingStatus();
    res.json(status);
  } catch (error) {
    logger.error(`Get polling status error: ${error.message}`);
    res.status(500).json({ error: 'Failed to get polling status', message: error.message });
  }
});

/**
 * @swagger
 * /api/polling/start:
 *   post:
 *     summary: Start polling service
 *     tags: [Polling]
 *     responses:
 *       200:
 *         description: Polling started
 */
router.post('/polling/start', async (req, res) => {
  try {
    pollingService.start();
    res.json({ message: 'Polling service started' });
  } catch (error) {
    logger.error(`Start polling error: ${error.message}`);
    res.status(500).json({ error: 'Failed to start polling', message: error.message });
  }
});

/**
 * @swagger
 * /api/polling/stop:
 *   post:
 *     summary: Stop polling service
 *     tags: [Polling]
 *     responses:
 *       200:
 *         description: Polling stopped
 */
router.post('/polling/stop', async (req, res) => {
  try {
    pollingService.stop();
    res.json({ message: 'Polling service stopped' });
  } catch (error) {
    logger.error(`Stop polling error: ${error.message}`);
    res.status(500).json({ error: 'Failed to stop polling', message: error.message });
  }
});

/**
 * @swagger
 * /api/polling/manual:
 *   post:
 *     summary: Trigger manual poll
 *     tags: [Polling]
 *     responses:
 *       200:
 *         description: Manual poll triggered
 */
router.post('/polling/manual', async (req, res) => {
  try {
    await pollingService.manualPoll();
    res.json({ message: 'Manual poll triggered' });
  } catch (error) {
    logger.error(`Manual poll error: ${error.message}`);
    res.status(500).json({ error: 'Manual poll failed', message: error.message });
  }
});

/**
 * @swagger
 * /api/system/health:
 *   get:
 *     summary: System health check
 *     tags: [System]
 *     responses:
 *       200:
 *         description: System health
 */
router.get('/system/health', async (req, res) => {
  try {
    const db = require('../config/database');
    await db.raw('SELECT 1');

    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: require('../../package.json').version,
      environment: process.env.NODE_ENV,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: 'connected',
      polling: await pollingService.getPollingStatus()
    };

    res.json(health);
  } catch (error) {
    logger.error(`Health check error: ${error.message}`);
    res.status(500).json({ 
      status: 'unhealthy', 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
