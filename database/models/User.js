const mongoose = require('mongoose');
const config = require('../../config/bot');

const userSchema = new mongoose.Schema({
    jid: {
        type: String,
        required: true,
        unique: true
    },
    alternativeJids: [{
        type: String
    }],
    pushName: {
        type: String,
        default: 'Unknown'
    },
    status: {
        type: String,
        enum: [config.statusTypes.OWNER, config.statusTypes.PREMIUM, config.statusTypes.BASIC],
        default: config.statusTypes.BASIC
    },
    balance: {
        type: Number,
        default: config.defaultBalance
    },
    genesis: {
        type: Number,
        default: config.defaultGenesis
    },
    limit: {
        type: Number,
        default: config.maxLimit
    },
    limitUsed: {
        type: Number,
        default: 0
    },
    lastLimitReset: {
        type: Date,
        default: Date.now
    },
    memberSince: {
        type: Date,
        default: Date.now
    },
    lastCommand: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Auto-set owner status for owner number
userSchema.pre('save', function(next) {
    if (this.jid.includes(config.ownerNumber)) {
        this.status = config.statusTypes.OWNER;
    }
    next();
});

module.exports = mongoose.model('User', userSchema);
