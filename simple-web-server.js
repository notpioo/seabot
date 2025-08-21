const { connectToDatabase } = require('./src/database/connection');
const SimpleWebServer = require('./web/simple-app');
const logger = require('./src/utils/logger');

async function startSimpleWebServer() {
    try {
        logger.info('Starting Simple Web Dashboard Server...');
        
        // Connect to MongoDB (required for dashboard data)
        await connectToDatabase();
        logger.info('Connected to MongoDB successfully');
        
        // Start Simple Web Server
        const webServer = new SimpleWebServer();
        webServer.start();
        
        logger.info('Simple Web Dashboard Server started successfully');
        
        // Handle graceful shutdown
        process.on('SIGINT', () => {
            logger.info('Received SIGINT, shutting down web server gracefully...');
            webServer.stop();
            process.exit(0);
        });

        process.on('SIGTERM', () => {
            logger.info('Received SIGTERM, shutting down web server gracefully...');
            webServer.stop();
            process.exit(0);
        });
        
    } catch (error) {
        logger.error('Failed to start Simple Web Dashboard Server:', error);
        process.exit(1);
    }
}

// Handle process termination gracefully
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
});

startSimpleWebServer();