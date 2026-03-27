const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const http = require('http');
const socketIo = require('socket.io');

const config = require('./config');
const logger = require('./utils/logger');
const pollingService = require('./services/pollingService');
const settingsService = require('./services/settingsService');

const apiRoutes = require('./routes/api');
const dashboardRoutes = require('./routes/dashboard');
const mountConfigRoutes = require('./routes/config');

const app = express();

// Load DB-backed runtime settings (system_settings) for live apply.
settingsService.init().catch((e) => logger.warn(`Settings init failed: ${e.message}`));
settingsService.on('changed', ({ key, value }) => {
  if (key === 'log_level') {
    try { logger.setLevel?.(String(value)); } catch {}
  }
});

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: config.security.corsOrigin,
    methods: ["GET", "POST"]
  }
});

app.use(helmet());
app.use(cors({
  origin: config.security.corsOrigin,
  credentials: true
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.security.apiRateLimit,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api', limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path} - ${req.ip}`);
  next();
});

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: config.app.name,
      version: config.app.version,
      description: 'AI-driven profile merging system for Opera Cloud via OHIP',
    },
    servers: [
      {
        url: `${config.frontend.url}/api`,
        description: 'Development server'
      }
    ],
  },
  apis: ['./src/routes/*.js'],
};

const specs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

app.use('/api', apiRoutes);
app.use('/dashboard', dashboardRoutes);

mountConfigRoutes(app);

const frontendDist = path.join(process.cwd(), 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.status(200).send('<h1>Opera Profile Merger</h1><p>Backend is running. Use <a href="/api/system/health">/api/system/health</a> or <a href="/api-docs">/api-docs</a>.</p>');
  });
}

app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message}`, err);
  res.status(500).json({
    error: 'Internal server error',
    message: config.app.env === 'development' ? err.message : 'Something went wrong'
  });
});

app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);
  
  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

global.io = io;

async function startServer() {
  try {
    // Skip database if SKIP_DATABASE is set (for testing)
    if (process.env.SKIP_DATABASE !== 'true') {
      const db = require('./config/database');
      await db.raw('SELECT 1');
      logger.info('Database connection established');

      await db.migrate.latest();
      logger.info('Database migrations completed');
    } else {
      logger.info('Database connection skipped (SKIP_DATABASE=true)');
    }

    pollingService.start();
    logger.info('Polling service started');

    server.listen(config.app.port, () => {
      logger.info(`${config.app.name} v${config.app.version} started on port ${config.app.port}`);
      logger.info(`Environment: ${config.app.env}`);
      logger.info(`API Documentation: http://localhost:${config.app.port}/api-docs`);
    });

  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
}

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  pollingService.stop();
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  pollingService.stop();
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('uncaughtException', (error) => {
  logger.error(`Uncaught Exception: ${error.message}`, error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled Rejection at ${promise}: ${reason}`);
  process.exit(1);
});

if (require.main === module) {
  startServer();
}

module.exports = { app, server, io };
