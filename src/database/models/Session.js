const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
    sessionId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    jid: {
        type: String,
        required: true,
        index: true
    },
    sessionData: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    deviceInfo: {
        browser: String,
        version: String,
        os: String,
        platform: String
    },
    connectionInfo: {
        lastConnected: {
            type: Date,
            default: Date.now
        },
        connectionCount: {
            type: Number,
            default: 1
        },
        totalUptime: {
            type: Number,
            default: 0
        }
    },
    isActive: {
        type: Boolean,
        default: true
    },
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    }
}, {
    timestamps: true,
    collection: 'sessions'
});

// Indexes
sessionSchema.index({ sessionId: 1 });
sessionSchema.index({ jid: 1 });
sessionSchema.index({ isActive: 1 });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Methods
sessionSchema.methods.updateLastConnected = function() {
    this.connectionInfo.lastConnected = new Date();
    this.connectionInfo.connectionCount += 1;
    this.isActive = true;
    return this.save();
};

sessionSchema.methods.deactivate = function() {
    this.isActive = false;
    return this.save();
};

sessionSchema.methods.extendExpiry = function(days = 30) {
    this.expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    return this.save();
};

sessionSchema.methods.addUptime = function(uptimeMs) {
    this.connectionInfo.totalUptime += uptimeMs;
    return this.save();
};

// Statics
sessionSchema.statics.findByJid = function(jid) {
    return this.findOne({ jid, isActive: true });
};

sessionSchema.statics.findActiveSession = function(sessionId) {
    return this.findOne({ sessionId, isActive: true });
};

sessionSchema.statics.deactivateExpiredSessions = function() {
    return this.updateMany(
        { expiresAt: { $lte: new Date() } },
        { $set: { isActive: false } }
    );
};

sessionSchema.statics.cleanupOldSessions = function(days = 60) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return this.deleteMany({
        $or: [
            { isActive: false, updatedAt: { $lte: cutoffDate } },
            { expiresAt: { $lte: cutoffDate } }
        ]
    });
};

sessionSchema.statics.getSessionStats = function() {
    return this.aggregate([
        {
            $group: {
                _id: null,
                totalSessions: { $sum: 1 },
                activeSessions: {
                    $sum: {
                        $cond: [{ $eq: ['$isActive', true] }, 1, 0]
                    }
                },
                averageUptime: { $avg: '$connectionInfo.totalUptime' },
                totalConnections: { $sum: '$connectionInfo.connectionCount' }
            }
        }
    ]);
};

module.exports = mongoose.model('Session', sessionSchema);
