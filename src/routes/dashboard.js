const express = require('express');
const db = require('../config/database');
const logger = require('../utils/logger');

const router = express.Router();

router.get('/api/dashboard/stats', async (req, res) => {
  try {
    const [profileStats] = await db('profiles').select(
      db.raw('COUNT(*) as total'),
      db.raw('COUNT(CASE WHEN has_master_keyword = true THEN 1 END) as master_profiles'),
      db.raw('COUNT(CASE WHEN status_code = \'Active\' THEN 1 END) as active'),
      db.raw('COUNT(CASE WHEN status_code = \'Inactive\' THEN 1 END) as inactive')
    );

    const [mergeStats] = await db('merge_audit').select(
      db.raw('COUNT(*) as total_merges'),
      db.raw('COUNT(CASE WHEN merge_status = \'COMPLETED\' THEN 1 END) as completed'),
      db.raw('COUNT(CASE WHEN merge_status = \'FAILED\' THEN 1 END) as failed'),
      db.raw('COUNT(CASE WHEN merge_status = \'PENDING\' THEN 1 END) as pending'),
      db.raw('AVG(similarity_score) as avg_similarity'),
      db.raw('MAX(created_at) as last_merge')
    );

    const [reviewStats] = await db('manual_reviews').select(
      db.raw('COUNT(*) as total_reviews'),
      db.raw('COUNT(CASE WHEN status = \'PENDING_REVIEW\' THEN 1 END) as pending'),
      db.raw('COUNT(CASE WHEN status = \'APPROVED\' THEN 1 END) as approved'),
      db.raw('COUNT(CASE WHEN status = \'REJECTED\' THEN 1 END) as rejected')
    );

    const recentMerges = await db('merge_audit')
      .select('*')
      .orderBy('created_at', 'desc')
      .limit(5);

    const pendingReviews = await db('manual_reviews')
      .select('*')
      .where('status', 'PENDING_REVIEW')
      .orderBy('created_at', 'desc')
      .limit(5);

    res.json({
      profileStats,
      mergeStats,
      reviewStats,
      recentMerges,
      pendingReviews
    });
  } catch (error) {
    logger.error(`Dashboard stats error: ${error.message}`);
    res.status(500).json({ error: 'Failed to get dashboard stats' });
  }
});

router.get('/api/dashboard/reviews', async (req, res) => {
  try {
    const { status = 'PENDING_REVIEW', page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const reviews = await db('manual_reviews')
      .select('*')
      .where('status', status)
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    const [{ total }] = await db('manual_reviews')
      .count('* as total')
      .where('status', status);

    res.json({
      reviews,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error(`Get reviews error: ${error.message}`);
    res.status(500).json({ error: 'Failed to get reviews' });
  }
});

router.post('/api/dashboard/reviews/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { notes, executedBy } = req.body;

    await db('manual_reviews')
      .where('id', id)
      .update({
        status: 'APPROVED',
        reviewed_by: executedBy || 'system',
        review_notes: notes,
        reviewed_at: new Date(),
        updated_at: new Date()
      });

    res.json({ message: 'Review approved' });
  } catch (error) {
    logger.error(`Approve review error: ${error.message}`);
    res.status(500).json({ error: 'Failed to approve review' });
  }
});

router.post('/api/dashboard/reviews/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { notes, executedBy } = req.body;

    await db('manual_reviews')
      .where('id', id)
      .update({
        status: 'REJECTED',
        reviewed_by: executedBy || 'system',
        review_notes: notes,
        reviewed_at: new Date(),
        updated_at: new Date()
      });

    res.json({ message: 'Review rejected' });
  } catch (error) {
    logger.error(`Reject review error: ${error.message}`);
    res.status(500).json({ error: 'Failed to reject review' });
  }
});

module.exports = router;
