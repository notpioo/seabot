const mongoose = require('mongoose');

const statsSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        unique: true
    },
    count: {
        type: Number,
        default: 0
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Static method to increment command counter
statsSchema.statics.incrementCommandCount = async function() {
    try {
        const result = await this.findOneAndUpdate(
            { type: 'totalCommands' },
            { 
                $inc: { count: 1 },
                $set: { lastUpdated: new Date() }
            },
            { 
                upsert: true, 
                new: true,
                runValidators: true
            }
        );
        return result.count;
    } catch (error) {
        console.error('Error incrementing command count:', error);
        return null;
    }
};

// Static method to get command count
statsSchema.statics.getCommandCount = async function() {
    try {
        const stat = await this.findOne({ type: 'totalCommands' });
        return stat ? stat.count : 0;
    } catch (error) {
        console.error('Error getting command count:', error);
        return 0;
    }
};

module.exports = mongoose.model('Stats', statsSchema);