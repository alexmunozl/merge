const winston = require('winston');
const path = require('path');
const config = require('../config');

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Create transports array - start with console only
const transports = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  })
];

// Try to add file transports, but don't fail if permissions don't allow it
if (config.app.env === 'production') {
  try {
    // Try to create file transports
    transports.push(
      new winston.transports.File({
        filename: path.join(config.logging.filePath, 'error.log'),
        level: 'error',
        maxsize: config.logging.maxSize,
        maxFiles: config.logging.maxFiles,
        tailable: true
      }),
      new winston.transports.File({
        filename: path.join(config.logging.filePath, 'combined.log'),
        maxsize: config.logging.maxSize,
        maxFiles: config.logging.maxFiles,
        tailable: true
      })
    );
  } catch (error) {
    // If file logging fails, continue with console only
    console.warn('File logging disabled, using console only:', error.message);
  }
}

const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  defaultMeta: { service: config.app.name },
  transports: transports
});

logger.setLevel = function setLevel(level) {
  if (!level) return;
  logger.level = level;
  for (const t of logger.transports) {
    if (t && typeof t.level === 'string') t.level = level;
  }
  logger.info(`Log level updated to ${level}`);
};

module.exports = logger;
