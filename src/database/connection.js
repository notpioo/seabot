const { Sequelize } = require('sequelize');
const config = require('../../config/config');
const logger = require('../utils/logger');

class DatabaseConnection {
    constructor() {
        this.sequelize = null;
        this.isConnected = false;
        this.connectionRetries = 0;
        this.maxRetries = 5;
    }

    async connect() {
        try {
            if (this.isConnected) {
                logger.info('Already connected to PostgreSQL');
                return;
            }

            logger.info('Connecting to PostgreSQL...');

            this.sequelize = new Sequelize(config.database.uri, config.database.options);

            // Test the connection
            await this.sequelize.authenticate();

            this.isConnected = true;
            this.connectionRetries = 0;

            logger.info(`Connected to PostgreSQL database: ${config.database.name}`);

            // Initialize models
            await this.initializeModels();

            // Sync database (create tables if they don't exist)
            await this.sequelize.sync();

            // Initialize default data
            await this.initializeDefaultData();

        } catch (error) {
            this.connectionRetries++;
            logger.error(`Failed to connect to PostgreSQL (attempt ${this.connectionRetries}/${this.maxRetries}):`, error.message);

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

    async initializeModels() {
        // Initialize all models with proper sequelize instance
        const { initializeCommandModel } = require('./models/Command');
        const { initializeUserModel } = require('./models/User');
        const { initializeMenuModel } = require('./models/Menu');
        const { initializeStatsModel } = require('./models/Stats');
        const { initializeSessionModel } = require('./models/Session');

        initializeCommandModel();
        initializeUserModel();
        initializeMenuModel();
        initializeStatsModel();
        initializeSessionModel();
    }

    async initializeDefaultData() {
        try {
            // Wait a bit for models to be fully initialized
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Initialize default commands
            const { Command } = require('./models/Command');
            if (Command && typeof Command.initializeCommands === 'function') {
                await Command.initializeCommands();
            }

            // Initialize default menu
            const { Menu } = require('./models/Menu');
            if (Menu && typeof Menu.initializeMenu === 'function') {
                await Menu.initializeMenu();
            }

            logger.info('Default data initialized successfully');
        } catch (error) {
            logger.error('Error initializing default data:', error);
        }
    }

    async disconnect() {
        try {
            if (this.sequelize) {
                await this.sequelize.close();
                logger.info('Disconnected from PostgreSQL');
            }
            this.isConnected = false;
        } catch (error) {
            logger.error('Error disconnecting from PostgreSQL:', error);
        }
    }

    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            database: config.database.name,
            host: config.database.host,
            port: config.database.port
        };
    }

    getSequelize() {
        return this.sequelize;
    }
}

const dbConnection = new DatabaseConnection();

module.exports = {
    connectToDatabase: () => dbConnection.connect(),
    disconnectFromDatabase: () => dbConnection.disconnect(),
    getConnectionStatus: () => dbConnection.getConnectionStatus()
};