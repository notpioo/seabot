const User = require('../database/models/User');
const config = require('../config/bot');

/**
 * Check if user can use command based on limit
 */
async function checkLimit(userId) {
    try {
        const user = await User.findById(userId);
        if (!user) return false;

        // Owner and premium have unlimited access
        if (user.status === config.statusTypes.OWNER || 
            user.status === config.statusTypes.PREMIUM) {
            return true;
        }

        // Check if limit reset is needed (daily reset)
        const now = new Date();
        const lastReset = user.lastLimitReset;
        const diffTime = Math.abs(now - lastReset);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays >= 1) {
            // Reset daily limit
            user.limitUsed = 0;
            user.lastLimitReset = now;
            await user.save();
        }

        // Check if user has remaining limit
        return user.limitUsed < user.limit;
    } catch (error) {
        console.error('Error checking limit:', error);
        return false;
    }
}

/**
 * Use one limit point
 */
async function useLimit(userId) {
    try {
        const user = await User.findById(userId);
        if (!user) return false;

        // Don't use limit for owner and premium
        if (user.status === config.statusTypes.OWNER || 
            user.status === config.statusTypes.PREMIUM) {
            return true;
        }

        user.limitUsed += 1;
        await user.save();
        return true;
    } catch (error) {
        console.error('Error using limit:', error);
        return false;
    }
}

/**
 * Reset daily limits for all users
 */
async function resetDailyLimits() {
    try {
        const result = await User.updateMany(
            { status: config.statusTypes.BASIC },
            { 
                limitUsed: 0,
                lastLimitReset: new Date()
            }
        );
        console.log(`✅ Reset daily limits for ${result.modifiedCount} users`);
        return true;
    } catch (error) {
        console.error('Error resetting daily limits:', error);
        return false;
    }
}

/**
 * Get user limit info
 */
async function getLimitInfo(userId) {
    try {
        const user = await User.findById(userId);
        if (!user) return null;

        if (user.status === config.statusTypes.OWNER || 
            user.status === config.statusTypes.PREMIUM) {
            return {
                unlimited: true,
                used: 0,
                remaining: '∞',
                total: '∞'
            };
        }

        return {
            unlimited: false,
            used: user.limitUsed,
            remaining: user.limit - user.limitUsed,
            total: user.limit
        };
    } catch (error) {
        console.error('Error getting limit info:', error);
        return null;
    }
}

module.exports = {
    checkLimit,
    useLimit,
    resetDailyLimits,
    getLimitInfo
};
