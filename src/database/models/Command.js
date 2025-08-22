const { DataTypes, Model } = require('sequelize');
const { getSequelize } = require('../connection');

class Command extends Model {
    // Static method to get total active commands
    static async getTotalActiveCommands() {
        try {
            const count = await this.count({ where: { isActive: true } });
            return count;
        } catch (error) {
            console.error('Error getting total active commands:', error);
            return 0;
        }
    }

    // Static method to increment command usage
    static async incrementUsage(commandName) {
        try {
            await this.increment('usageCount', {
                where: { name: commandName }
            });
        } catch (error) {
            console.error('Error incrementing command usage:', error);
        }
    }

    // Static method to initialize default commands
    static async initializeCommands() {
        try {
            const commands = [
                {
                    name: 'ping',
                    description: 'Check bot response time and status',
                    category: 'utility',
                    cooldown: 2,
                    ownerOnly: false,
                    isActive: true
                },
                {
                    name: 'menu',
                    description: 'Show bot menu with available commands and features',
                    category: 'general',
                    cooldown: 3,
                    ownerOnly: false,
                    isActive: true
                }
            ];

            for (const cmd of commands) {
                await this.findOrCreate({
                    where: { name: cmd.name },
                    defaults: cmd
                });
            }
            
            console.log('Commands initialized successfully');
        } catch (error) {
            console.error('Error initializing commands:', error);
        }
    }
}

// Get sequelize instance from connection
const dbConnection = require('../connection');
let sequelize;

// Initialize the model only when sequelize is available
const initializeCommandModel = () => {
    const connection = require('../connection');
    if (!sequelize && connection.getSequelize) {
        sequelize = connection.getSequelize();
    }

    if (sequelize) {
        Command.init({
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            name: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true,
                set(value) {
                    this.setDataValue('name', value ? value.toLowerCase().trim() : value);
                }
            },
            description: {
                type: DataTypes.TEXT,
                allowNull: false
            },
            category: {
                type: DataTypes.ENUM('general', 'utility', 'fun', 'admin', 'owner'),
                defaultValue: 'general'
            },
            isActive: {
                type: DataTypes.BOOLEAN,
                defaultValue: true
            },
            cooldown: {
                type: DataTypes.INTEGER,
                defaultValue: 2 // in seconds
            },
            ownerOnly: {
                type: DataTypes.BOOLEAN,
                defaultValue: false
            },
            usageCount: {
                type: DataTypes.INTEGER,
                defaultValue: 0
            }
        }, {
            sequelize,
            modelName: 'Command',
            tableName: 'commands',
            timestamps: true
        });
    }
};

// Try to initialize immediately if sequelize is available
try {
    initializeCommandModel();
} catch (error) {
    // Will be initialized later when connection is established
}

module.exports = { Command, initializeCommandModel };