exports.seed = function(knex) {
  return knex('system_settings').del()
    .then(function () {
      return knex('system_settings').insert([
        {
          key: 'ai_confidence_threshold',
          value: '0.85',
          description: 'Minimum confidence score for automatic duplicate detection',
          type: 'decimal'
        },
        {
          key: 'ai_name_similarity_threshold',
          value: '0.8',
          description: 'Minimum name similarity score for matching',
          type: 'decimal'
        },
        {
          key: 'ai_email_similarity_threshold',
          value: '0.9',
          description: 'Minimum email similarity score for matching',
          type: 'decimal'
        },
        {
          key: 'ai_phone_similarity_threshold',
          value: '0.85',
          description: 'Minimum phone similarity score for matching',
          type: 'decimal'
        },
        {
          key: 'ai_address_similarity_threshold',
          value: '0.8',
          description: 'Minimum address similarity score for matching',
          type: 'decimal'
        },
        {
          key: 'master_profile_keywords',
          value: 'MASTER_PROFILE,DO_NOT_MERGE,PRIMARY_PROFILE',
          description: 'Comma-separated list of keywords that protect profiles from being merged',
          type: 'string'
        },
        {
          key: 'polling_interval',
          value: '300000',
          description: 'Polling interval in milliseconds (5 minutes)',
          type: 'integer'
        },
        {
          key: 'merge_batch_size',
          value: '50',
          description: 'Number of profiles to process in each batch',
          type: 'integer'
        },
        {
          key: 'max_merge_attempts',
          value: '3',
          description: 'Maximum number of merge attempts before giving up',
          type: 'integer'
        },
        {
          key: 'auto_merge_enabled',
          value: 'true',
          description: 'Enable automatic merging for high-confidence matches',
          type: 'boolean'
        },
        {
          key: 'manual_review_enabled',
          value: 'true',
          description: 'Enable manual review for borderline cases',
          type: 'boolean'
        },
        {
          key: 'notification_email_enabled',
          value: 'false',
          description: 'Enable email notifications for manual reviews',
          type: 'boolean'
        },
        {
          key: 'log_level',
          value: 'info',
          description: 'Logging level (error, warn, info, debug)',
          type: 'string'
        }
      ]);
    });
};
