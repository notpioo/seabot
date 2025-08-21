const mongoose = require('mongoose');

const commandSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    category: {
        type: String,
        default: 'general',
        enum: ['general', 'utility', 'fun', 'admin', 'owner']
    },
    isActive: {
        type: Boolean,
        default: true
    },
    
    cooldown: {
        type: Number,
        default: 2 // in seconds
    },
    ownerOnly: {
        type: Boolean,
        default: false
    },
    usageCount: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Static method to get total active commands
commandSchema.statics.getTotalActiveCommands = async function() {
    try {
        const count = await this.countDocuments({ isActive: true });
        return count;
    } catch (error) {
        console.error('Error getting total active commands:', error);
        return 0;
    }
};

// Static method to increment command usage
commandSchema.statics.incrementUsage = async function(commandName) {
    try {
        await this.findOneAndUpdate(
            { name: commandName },
            { 
                $inc: { usageCount: 1 },
                $set: { updatedAt: new Date() }
            },
            { upsert: false }
        );
    } catch (error) {
        console.error('Error incrementing command usage:', error);
    }
};

// Static method to initialize default commands
commandSchema.statics.initializeCommands = async function() {
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
            await this.findOneAndUpdate(
                { name: cmd.name },
                cmd,
                { upsert: true, new: true }
            );
        }
        
        console.log('Commands initialized successfully');
    } catch (error) {
        console.error('Error initializing commands:', error);
    }
};

module.exports = mongoose.model('Command', commandSchema);