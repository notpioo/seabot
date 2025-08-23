const User = require('../database/models/User');
const config = require('../config/bot');
const { sanitizeJid } = require('../utils/helpers');

/**
 * Check if user is owner using multiple ID formats
 */
function isUserOwner(jid) {
    const userId = jid.split('@')[0];
    
    // Check against owner number
    if (userId === config.ownerNumber || jid.includes(config.ownerNumber)) {
        return true;
    }
    
    // Check against owners array (includes LID)
    if (config.owners && config.owners.includes(userId)) {
        return true;
    }
    
    return false;
}

/**
 * Get user information or create new user
 */
async function getUserInfo(jid, pushName = 'Unknown') {
    try {
        // Normalize JID to handle both group and private chats consistently
        const normalizedJid = sanitizeJid(jid);
        
        // First, try to find user by primary JID
        let user = await User.findOne({ jid: normalizedJid });
        
        // If not found, try to find by alternative JIDs (for LID mapping)
        if (!user) {
            user = await User.findOne({ alternativeJids: normalizedJid });
        }
        
        // If still not found, try to find by pushName (same user different JID)
        if (!user && pushName && pushName !== 'Unknown') {
            const existingUser = await User.findOne({ pushName: pushName });
            if (existingUser) {
                // Add this JID as alternative JID for existing user
                if (!existingUser.alternativeJids.includes(normalizedJid)) {
                    existingUser.alternativeJids.push(normalizedJid);
                    await existingUser.save();
                    console.log(`🔗 Linked JID ${normalizedJid} to existing user: ${pushName}`);
                }
                return existingUser;
            }
        }
        
        if (!user) {
            // Check if user is owner using multiple formats
            const isOwner = isUserOwner(normalizedJid);
            
            // Create new user
            user = new User({
                jid: normalizedJid,
                alternativeJids: [],
                pushName,
                status: isOwner ? config.statusTypes.OWNER : config.statusTypes.BASIC
            });
            await user.save();
            console.log(`✅ New user registered: ${pushName} (${normalizedJid}) - Status: ${user.status}`);
        } else {
            // Update push name if different
            if (user.pushName !== pushName) {
                user.pushName = pushName;
                await user.save();
            }
            
            // Add current JID as alternative if not already present
            if (!user.alternativeJids.includes(normalizedJid) && user.jid !== normalizedJid) {
                user.alternativeJids.push(normalizedJid);
                await user.save();
                console.log(`🔗 Added alternative JID ${normalizedJid} for user: ${pushName}`);
            }
        }

        return user;
    } catch (error) {
        console.error('Error getting user info:', error);
        throw error;
    }
}

/**
 * Update user's last activity
 */
async function updateUserActivity(userId) {
    try {
        await User.findByIdAndUpdate(userId, {
            lastCommand: new Date()
        });
    } catch (error) {
        console.error('Error updating user activity:', error);
    }
}

/**
 * Update user status
 */
async function updateUserStatus(jid, status) {
    try {
        const user = await User.findOne({ jid });
        if (!user) return false;

        user.status = status;
        await user.save();
        return true;
    } catch (error) {
        console.error('Error updating user status:', error);
        return false;
    }
}

/**
 * Add balance to user
 */
async function addBalance(jid, amount) {
    try {
        const user = await User.findOne({ jid });
        if (!user) return false;

        user.balance += amount;
        await user.save();
        return user.balance;
    } catch (error) {
        console.error('Error adding balance:', error);
        return false;
    }
}

/**
 * Deduct balance from user
 */
async function deductBalance(jid, amount) {
    try {
        const user = await User.findOne({ jid });
        if (!user || user.balance < amount) return false;

        user.balance -= amount;
        await user.save();
        return user.balance;
    } catch (error) {
        console.error('Error deducting balance:', error);
        return false;
    }
}

module.exports = {
    getUserInfo,
    updateUserActivity,
    updateUserStatus,
    addBalance,
    deductBalance
};
