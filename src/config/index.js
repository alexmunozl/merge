require('dotenv').config();

module.exports = {
  app: {
    name: process.env.APP_NAME || 'Opera Profile Merger',
    version: process.env.APP_VERSION || '1.0.0',
    port: parseInt(process.env.PORT) || 3000,
    env: process.env.NODE_ENV || 'development'
  },

  database: {
    development: {
      client: 'postgresql',
      connection: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'opera_merger',
        user: process.env.DB_USER || 'opera_user',
        password: process.env.DB_PASSWORD || 'opera_password'
      },
      pool: {
        min: 2,
        max: 10
      },
      migrations: {
        directory: './database/migrations'
      },
      seeds: {
        directory: './database/seeds'
      }
    },
    production: {
      client: 'postgresql',
      connection: process.env.DATABASE_URL,
      pool: {
        min: 2,
        max: 10
      },
      migrations: {
        directory: './database/migrations'
      },
      seeds: {
        directory: './database/seeds'
      }
    }
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379
  },

  ohip: {
    baseUrl: process.env.OHIP_BASE_URL,
    clientId: process.env.OHIP_CLIENT_ID,
    clientSecret: process.env.OHIP_CLIENT_SECRET,
    hotelId: process.env.OHIP_HOTEL_ID,
    appKey: process.env.OHAPP_KEY,
    timeout: parseInt(process.env.OHIP_TIMEOUT) || 30000,
    retryAttempts: parseInt(process.env.OHIP_RETRY_ATTEMPTS) || 3,
    // OAuth scopes configuration
    scopes: (process.env.OHIP_SCOPES || '').split(',').filter(s => s.trim()),
    externalSystem: process.env.OHIP_EXTERNAL_SYSTEM || 'OperaProfileMerger',
    originatingApplication: process.env.OHIP_ORIGINATING_APP || 'Opera Profile Merger v1.0.0'
  },

  ai: {
    confidenceThreshold: parseFloat(process.env.AI_CONFIDENCE_THRESHOLD) || 0.85,
    nameSimilarityThreshold: parseFloat(process.env.AI_NAME_SIMILARITY_THRESHOLD) || 0.8,
    emailSimilarityThreshold: parseFloat(process.env.AI_EMAIL_SIMILARITY_THRESHOLD) || 0.9,
    phoneSimilarityThreshold: parseFloat(process.env.AI_PHONE_SIMILARITY_THRESHOLD) || 0.85,
    addressSimilarityThreshold: parseFloat(process.env.AI_ADDRESS_SIMILARITY_THRESHOLD) || 0.8
  },

  businessRules: {
    masterProfileKeywords: (process.env.MASTER_PROFILE_KEYWORDS || 'MASTER_PROFILE,DO_NOT_MERGE,PRIMARY_PROFILE').split(','),
    pollingInterval: parseInt(process.env.POLLING_INTERVAL) || 300000, // 5 minutes
    mergeBatchSize: parseInt(process.env.MERGE_BATCH_SIZE) || 50,
    maxMergeAttempts: parseInt(process.env.MAX_MERGE_ATTEMPTS) || 3
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    filePath: process.env.LOG_FILE_PATH || './logs/app.log',
    maxSize: process.env.LOG_MAX_SIZE || '10m',
    maxFiles: parseInt(process.env.LOG_MAX_FILES) || 5
  },

  security: {
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
    apiRateLimit: parseInt(process.env.API_RATE_LIMIT) || 100,
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000'
  },

  email: {
    smtp: {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    },
    from: process.env.EMAIL_FROM || 'Opera Profile Merger <noreply@yourhotel.com>'
  },

  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:3000',
    apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3000/api'
  }
};
