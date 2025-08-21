const mongoose = require('mongoose');
const config = require('../../config/config');
const logger = require('../utils/logger');
const Menu = require('./models/Menu'); // Assuming Menu model is in ./models/Menu

class DatabaseConnection {
    constructor() {
        this.isConnected = false;
        this.connectionRetries = 0;
        this.maxRetries = 5;
    }

    async connect() {
        try {
            if (this.isConnected) {
                logger.info('Already connected to MongoDB');
                return;
            }

            logger.info('Connecting to MongoDB...');

            await mongoose.connect(config.database.uri, {
                ...config.database.options,
                dbName: config.database.name
            });

            this.isConnected = true;
            this.connectionRetries = 0;

            logger.info(`Connected to MongoDB database: ${config.database.name}`);

            // Initialize default commands
            const Command = require('./models/Command');
            await Command.initializeCommands();

            // Initialize default menu
            await Menu.initializeMenu();

            // Set up connection event handlers
            this.setupEventHandlers();

        } catch (error) {
            this.connectionRetries++;
            logger.error(`Failed to connect to MongoDB (attempt ${this.connectionRetries}/${this.maxRetries}):`, error.message);

            if (this.connectionRetries < this.maxRetries) {
                const retryDelay = Math.min(1000 * Math.pow(2, this.connectionRetries), 30000);
                logger.info(`Retrying connection in ${retryDelay}ms...`);

                setTimeout(() => {
                    this.connect();
                }, retryDelay);
            } else {
                logger.error('Max connection retries reached. Exiting...');
                process.exit(1);
            }
        }
    }

    setupEventHandlers() {
        mongoose.connection.on('connected', () => {
            logger.info('Mongoose connected to MongoDB');
            this.isConnected = true;
        });

        mongoose.connection.on('error', (error) => {
            logger.error('Mongoose connection error:', error);
            this.isConnected = false;
        });

        mongoose.connection.on('disconnected', () => {
            logger.warn('Mongoose disconnected from MongoDB');
            this.isConnected = false;

            // Attempt to reconnect
            setTimeout(() => {
                if (!this.isConnected) {
                    logger.info('Attempting to reconnect to MongoDB...');
                    this.connect();
                }
            }, 5000);
        });

        // Handle app termination
        process.on('SIGINT', async () => {
            await this.disconnect();
            process.exit(0);
        });

        process.on('SIGTERM', async () => {
            await this.disconnect();
            process.exit(0);
        });
    }

    async disconnect() {
        try {
            if (mongoose.connection.readyState !== 0) {
                await mongoose.connection.close();
                logger.info('Disconnected from MongoDB');
            }
            this.isConnected = false;
        } catch (error) {
            logger.error('Error disconnecting from MongoDB:', error);
        }
    }

    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            readyState: mongoose.connection.readyState,
            host: mongoose.connection.host,
            port: mongoose.connection.port,
            name: mongoose.connection.name
        };
    }
}

const dbConnection = new DatabaseConnection();

module.exports = {
    connectToDatabase: () => dbConnection.connect(),
    disconnectFromDatabase: () => dbConnection.disconnect(),
    getConnectionStatus: () => dbConnection.getConnectionStatus()
};