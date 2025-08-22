const { DataTypes, Model, Op } = require('sequelize');

class Stats extends Model {
    // Static method to increment command counter
    static async incrementCommandCount() {
        try {
            const [stat, created] = await this.findOrCreate({
                where: { type: 'totalCommands' },
                defaults: { type: 'totalCommands', count: 0, lastUpdated: new Date() }
            });
            
            if (!created) {
                await stat.increment('count');
                stat.lastUpdated = new Date();
                await stat.save();
            } else {
                await stat.increment('count');
            }
            
            await stat.reload();
            return stat.count;
        } catch (error) {
            console.error('Error incrementing command count:', error);
            return null;
        }
    }

    // Static method to get command count
    static async getCommandCount() {
        try {
            const stat = await this.findOne({ where: { type: 'totalCommands' } });
            return stat ? stat.count : 0;
        } catch (error) {
            console.error('Error getting command count:', error);
            return 0;
        }
    }
}

// Get sequelize instance from connection
const dbConnection = require('../connection');
let sequelize;

// Initialize the model only when sequelize is available
const initializeStatsModel = () => {
    const connection = require('../connection');
    if (!sequelize && connection.getSequelize) {
        sequelize = connection.getSequelize();
    }

    if (sequelize) {
        Stats.init({
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            type: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true
            },
            count: {
                type: DataTypes.INTEGER,
                defaultValue: 0
            },
            lastUpdated: {
                type: DataTypes.DATE,
                defaultValue: DataTypes.NOW
            }
        }, {
            sequelize,
            modelName: 'Stats',
            tableName: 'stats',
            timestamps: true
        });
    }
};

// Try to initialize immediately if sequelize is available
try {
    initializeStatsModel();
} catch (error) {
    // Will be initialized later when connection is established
}

module.exports = { Stats, initializeStatsModel };