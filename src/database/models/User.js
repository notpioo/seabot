const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    jid: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    name: {
        type: String,
        default: null
    },
    phoneNumber: {
        type: String,
        default: null
    },
    isOwner: {
        type: Boolean,
        default: false
    },
    isBanned: {
        type: Boolean,
        default: false
    },
    banReason: {
        type: String,
        default: null
    },
    banExpiry: {
        type: Date,
        default: null
    },
    messageCount: {
        type: Number,
        default: 0
    },
    commandCount: {
        type: Number,
        default: 0
    },
    lastSeen: {
        type: Date,
        default: Date.now
    },
    firstSeen: {
        type: Date,
        default: Date.now
    },
    settings: {
        language: {
            type: String,
            default: 'en'
        },
        notifications: {
            type: Boolean,
            default: true
        }
    },
    stats: {
        totalCommands: {
            type: Number,
            default: 0
        },
        totalMessages: {
            type: Number,
            default: 0
        },
        favoriteCommands: [{
            command: String,
            count: Number
        }]
    }
}, {
    timestamps: true,
    collection: 'users'
});

// Indexes
userSchema.index({ jid: 1 });
userSchema.index({ isOwner: 1 });
userSchema.index({ isBanned: 1 });
userSchema.index({ lastSeen: 1 });

// Methods
userSchema.methods.ban = function(reason, duration) {
    this.isBanned = true;
    this.banReason = reason;
    if (duration) {
        this.banExpiry = new Date(Date.now() + duration);
    }
    return this.save();
};

userSchema.methods.unban = function() {
    this.isBanned = false;
    this.banReason = null;
    this.banExpiry = null;
    return this.save();
};

userSchema.methods.isCurrentlyBanned = function() {
    if (!this.isBanned) return false;
    if (!this.banExpiry) return true;
    return Date.now() < this.banExpiry.getTime();
};

userSchema.methods.incrementMessageCount = function() {
    this.messageCount += 1;
    this.stats.totalMessages += 1;
    this.lastSeen = new Date();
    return this.save();
};

userSchema.methods.incrementCommandCount = function(command) {
    this.commandCount += 1;
    this.stats.totalCommands += 1;
    
    // Update favorite commands
    const favCommand = this.stats.favoriteCommands.find(f => f.command === command);
    if (favCommand) {
        favCommand.count += 1;
    } else {
        this.stats.favoriteCommands.push({ command, count: 1 });
    }
    
    // Keep only top 10 favorite commands
    this.stats.favoriteCommands.sort((a, b) => b.count - a.count);
    this.stats.favoriteCommands = this.stats.favoriteCommands.slice(0, 10);
    
    this.lastSeen = new Date();
    return this.save();
};

// Statics
userSchema.statics.findByJid = function(jid) {
    return this.findOne({ jid });
};

userSchema.statics.findOwners = function() {
    return this.find({ isOwner: true });
};

userSchema.statics.findBanned = function() {
    return this.find({ isBanned: true });
};

userSchema.statics.getActiveUsers = function(days = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return this.find({
        lastSeen: { $gte: cutoffDate }
    }).sort({ lastSeen: -1 });
};

userSchema.statics.getUserStats = function() {
    return this.aggregate([
        {
            $group: {
                _id: null,
                totalUsers: { $sum: 1 },
                totalMessages: { $sum: '$messageCount' },
                totalCommands: { $sum: '$commandCount' },
                bannedUsers: {
                    $sum: {
                        $cond: [{ $eq: ['$isBanned', true] }, 1, 0]
                    }
                }
            }
        }
    ]);
};

module.exports = mongoose.model('User', userSchema);
