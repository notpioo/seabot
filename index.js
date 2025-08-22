const { connectToDatabase } = require('./src/database/connection');
const WhatsAppClient = require('./src/client/whatsapp');
// const WebServer = require('./web/app');
const logger = require('./src/utils/logger');
const config = require('./config/config');

async function startBot() {
    try {
        logger.info('Starting SeaBot...');
        
        // Connect to MongoDB
        await connectToDatabase();
        logger.info('Connected to MongoDB successfully');
        
        // Initialize commands in database
        const { Command } = require('./src/database/models/Command');
        if (Command && Command.initializeCommands) {
            await Command.initializeCommands();
        }
        
        // Start Web Server
        // const webServer = new WebServer();
        // webServer.start();
        
        // Initialize WhatsApp client
        const whatsappClient = new WhatsAppClient();
        await whatsappClient.initialize();
        
        logger.info('SeaBot started successfully');
    } catch (error) {
        logger.error('Failed to start SeaBot:', error);
        process.exit(1);
    }
}

// Handle process termination gracefully
process.on('SIGINT', () => {
    logger.info('Received SIGINT, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, shutting down gracefully...');
    process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
});

startBot();
