const { connectToDatabase } = require('./src/database/connection');
const WebServer = require('./web/app');
const logger = require('./src/utils/logger');

async function startWebServer() {
    try {
        logger.info('Starting Web Dashboard Server...');
        
        // Connect to MongoDB (required for dashboard data)
        await connectToDatabase();
        logger.info('Connected to MongoDB successfully');
        
        // Start Web Server
        const webServer = new WebServer();
        webServer.start();
        
        logger.info('Web Dashboard Server started successfully');
        
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
        logger.error('Failed to start Web Dashboard Server:', error);
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

startWebServer();