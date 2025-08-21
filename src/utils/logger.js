const winston = require('winston');
const path = require('path');
const fs = require('fs');
const config = require('../../config/config');

// Ensure logs directory exists
const logsDir = path.dirname(config.logging.file.filename);
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for console output
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let msg = `${timestamp} [${level}]: ${message}`;
        
        if (Object.keys(meta).length > 0) {
            msg += '\n' + JSON.stringify(meta, null, 2);
        }
        
        return msg;
    })
);

// Custom format for file output
const fileFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

// Create transports array
const transports = [];

// Console transport
if (config.logging.console.enabled) {
    transports.push(new winston.transports.Console({
        level: config.logging.level,
        format: consoleFormat,
        handleExceptions: true,
        handleRejections: true
    }));
}

// File transport
if (config.logging.file.enabled) {
    transports.push(new winston.transports.File({
        level: config.logging.level,
        filename: config.logging.file.filename,
        format: fileFormat,
        maxsize: config.logging.file.maxSize,
        maxFiles: config.logging.file.maxFiles,
        handleExceptions: true,
        handleRejections: true
    }));
}

// Create logger instance
const logger = winston.createLogger({
    level: config.logging.level,
    transports,
    exitOnError: false
});

// Add custom methods
logger.command = (command, user, args = []) => {
    logger.info(`Command executed: ${command}`, {
        type: 'command',
        command,
        user,
        args,
        timestamp: new Date().toISOString()
    });
};

logger.database = (operation, collection, data = {}) => {
    logger.debug(`Database operation: ${operation}`, {
        type: 'database',
        operation,
        collection,
        data,
        timestamp: new Date().toISOString()
    });
};

logger.whatsapp = (event, data = {}) => {
    logger.info(`WhatsApp event: ${event}`, {
        type: 'whatsapp',
        event,
        data,
        timestamp: new Date().toISOString()
    });
};

logger.security = (event, user, data = {}) => {
    logger.warn(`Security event: ${event}`, {
        type: 'security',
        event,
        user,
        data,
        timestamp: new Date().toISOString()
    });
};

logger.performance = (operation, duration, data = {}) => {
    logger.info(`Performance: ${operation} took ${duration}ms`, {
        type: 'performance',
        operation,
        duration,
        data,
        timestamp: new Date().toISOString()
    });
};

// Handle uncaught exceptions and rejections
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
});

module.exports = logger;
