const { DataTypes, Model, Op } = require('sequelize');

class Session extends Model {
    // Instance methods
    async updateLastConnected() {
        const connectionInfo = this.connectionInfo || {};
        connectionInfo.lastConnected = new Date();
        connectionInfo.connectionCount = (connectionInfo.connectionCount || 0) + 1;
        this.connectionInfo = connectionInfo;
        this.isActive = true;
        return this.save();
    }

    async deactivate() {
        this.isActive = false;
        return this.save();
    }

    async extendExpiry(days = 30) {
        this.expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
        return this.save();
    }

    async addUptime(uptimeMs) {
        const connectionInfo = this.connectionInfo || {};
        connectionInfo.totalUptime = (connectionInfo.totalUptime || 0) + uptimeMs;
        this.connectionInfo = connectionInfo;
        return this.save();
    }

    // Static methods
    static findByJid(jid) {
        return this.findOne({ where: { jid, isActive: true } });
    }

    static findActiveSession(sessionId) {
        return this.findOne({ where: { sessionId, isActive: true } });
    }

    static deactivateExpiredSessions() {
        return this.update(
            { isActive: false },
            { where: { expiresAt: { [Op.lte]: new Date() } } }
        );
    }

    static cleanupOldSessions(days = 60) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        
        return this.destroy({
            where: {
                [Op.or]: [
                    { isActive: false, updatedAt: { [Op.lte]: cutoffDate } },
                    { expiresAt: { [Op.lte]: cutoffDate } }
                ]
            }
        });
    }

    static async getSessionStats() {
        try {
            const result = await this.findAll({
                attributes: [
                    [this.sequelize.fn('COUNT', '*'), 'totalSessions'],
                    [this.sequelize.fn('COUNT', this.sequelize.literal('CASE WHEN "isActive" = true THEN 1 END')), 'activeSessions'],
                    [this.sequelize.fn('AVG', this.sequelize.literal('"connectionInfo"::jsonb->\'totalUptime\'')), 'averageUptime'],
                    [this.sequelize.fn('SUM', this.sequelize.literal('"connectionInfo"::jsonb->\'connectionCount\'')), 'totalConnections']
                ],
                raw: true
            });
            return result[0];
        } catch (error) {
            console.error('Error getting session stats:', error);
            return { totalSessions: 0, activeSessions: 0, averageUptime: 0, totalConnections: 0 };
        }
    }
}

// Get sequelize instance from connection
const dbConnection = require('../connection');
let sequelize;

// Initialize the model only when sequelize is available
const initializeSessionModel = () => {
    const connection = require('../connection');
    if (!sequelize && connection.getSequelize) {
        sequelize = connection.getSequelize();
    }

    if (sequelize) {
        Session.init({
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            sessionId: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true
            },
            jid: {
                type: DataTypes.STRING,
                allowNull: false
            },
            sessionData: {
                type: DataTypes.JSONB,
                allowNull: false
            },
            deviceInfo: {
                type: DataTypes.JSONB,
                defaultValue: {}
            },
            connectionInfo: {
                type: DataTypes.JSONB,
                defaultValue: {
                    lastConnected: new Date(),
                    connectionCount: 1,
                    totalUptime: 0
                }
            },
            isActive: {
                type: DataTypes.BOOLEAN,
                defaultValue: true
            },
            expiresAt: {
                type: DataTypes.DATE,
                defaultValue: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
            }
        }, {
            sequelize,
            modelName: 'Session',
            tableName: 'sessions',
            timestamps: true,
            indexes: [
                { fields: ['sessionId'] },
                { fields: ['jid'] },
                { fields: ['isActive'] },
                { fields: ['expiresAt'] }
            ]
        });
    }
};

// Try to initialize immediately if sequelize is available
try {
    initializeSessionModel();
} catch (error) {
    // Will be initialized later when connection is established
}

module.exports = { Session, initializeSessionModel };
