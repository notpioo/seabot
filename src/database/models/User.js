const { DataTypes, Model, Op } = require('sequelize');

class User extends Model {
    // Instance methods
    async ban(reason, duration) {
        this.isBanned = true;
        this.banReason = reason;
        if (duration) {
            this.banExpiry = new Date(Date.now() + duration);
        }
        return this.save();
    }

    async unban() {
        this.isBanned = false;
        this.banReason = null;
        this.banExpiry = null;
        return this.save();
    }

    isCurrentlyBanned() {
        if (!this.isBanned) return false;
        if (!this.banExpiry) return true;
        return Date.now() < this.banExpiry.getTime();
    }

    async incrementMessageCount() {
        this.messageCount += 1;
        const stats = this.stats || {};
        stats.totalMessages = (stats.totalMessages || 0) + 1;
        this.stats = stats;
        this.lastSeen = new Date();
        return this.save();
    }

    async incrementCommandCount(command) {
        this.commandCount += 1;
        const stats = this.stats || {};
        stats.totalCommands = (stats.totalCommands || 0) + 1;
        
        // Update favorite commands
        const favoriteCommands = stats.favoriteCommands || [];
        const favCommand = favoriteCommands.find(f => f.command === command);
        if (favCommand) {
            favCommand.count += 1;
        } else {
            favoriteCommands.push({ command, count: 1 });
        }
        
        // Keep only top 10 favorite commands
        favoriteCommands.sort((a, b) => b.count - a.count);
        stats.favoriteCommands = favoriteCommands.slice(0, 10);
        
        this.stats = stats;
        this.lastSeen = new Date();
        return this.save();
    }

    // Static methods
    static findByJid(jid) {
        return this.findOne({ where: { jid } });
    }

    static findOwners() {
        return this.findAll({ where: { isOwner: true } });
    }

    static findBanned() {
        return this.findAll({ where: { isBanned: true } });
    }

    static getActiveUsers(days = 7) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        
        return this.findAll({
            where: {
                lastSeen: {
                    [Op.gte]: cutoffDate
                }
            },
            order: [['lastSeen', 'DESC']]
        });
    }

    static async getUserStats() {
        try {
            const result = await this.findAll({
                attributes: [
                    [this.sequelize.fn('COUNT', '*'), 'totalUsers'],
                    [this.sequelize.fn('SUM', this.sequelize.col('messageCount')), 'totalMessages'],
                    [this.sequelize.fn('SUM', this.sequelize.col('commandCount')), 'totalCommands'],
                    [this.sequelize.fn('COUNT', this.sequelize.literal('CASE WHEN "isBanned" = true THEN 1 END')), 'bannedUsers']
                ],
                raw: true
            });
            return result[0];
        } catch (error) {
            console.error('Error getting user stats:', error);
            return { totalUsers: 0, totalMessages: 0, totalCommands: 0, bannedUsers: 0 };
        }
    }
}

// Get sequelize instance from connection
const dbConnection = require('../connection');
let sequelize;

// Initialize the model only when sequelize is available
const initializeUserModel = () => {
    const connection = require('../connection');
    if (!sequelize && connection.getSequelize) {
        sequelize = connection.getSequelize();
    }

    if (sequelize) {
        User.init({
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            jid: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true
            },
            name: {
                type: DataTypes.STRING,
                allowNull: true
            },
            phoneNumber: {
                type: DataTypes.STRING,
                allowNull: true
            },
            isOwner: {
                type: DataTypes.BOOLEAN,
                defaultValue: false
            },
            isBanned: {
                type: DataTypes.BOOLEAN,
                defaultValue: false
            },
            banReason: {
                type: DataTypes.TEXT,
                allowNull: true
            },
            banExpiry: {
                type: DataTypes.DATE,
                allowNull: true
            },
            messageCount: {
                type: DataTypes.INTEGER,
                defaultValue: 0
            },
            commandCount: {
                type: DataTypes.INTEGER,
                defaultValue: 0
            },
            lastSeen: {
                type: DataTypes.DATE,
                defaultValue: DataTypes.NOW
            },
            firstSeen: {
                type: DataTypes.DATE,
                defaultValue: DataTypes.NOW
            },
            settings: {
                type: DataTypes.JSONB,
                defaultValue: {
                    language: 'en',
                    notifications: true
                }
            },
            stats: {
                type: DataTypes.JSONB,
                defaultValue: {
                    totalCommands: 0,
                    totalMessages: 0,
                    favoriteCommands: []
                }
            }
        }, {
            sequelize,
            modelName: 'User',
            tableName: 'users',
            timestamps: true,
            indexes: [
                { fields: ['jid'] },
                { fields: ['isOwner'] },
                { fields: ['isBanned'] },
                { fields: ['lastSeen'] }
            ]
        });
    }
};

// Try to initialize immediately if sequelize is available
try {
    initializeUserModel();
} catch (error) {
    // Will be initialized later when connection is established
}

module.exports = { User, initializeUserModel };
