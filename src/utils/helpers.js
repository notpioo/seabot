const config = require('../../config/config');

/**
 * Check if a message starts with a valid command prefix
 * @param {string} text - The message text
 * @returns {boolean} - True if the message starts with a valid prefix
 */
function isValidCommand(text) {
    if (!text || typeof text !== 'string') return false;
    
    return config.bot.prefixes.some(prefix => text.trim().startsWith(prefix));
}

/**
 * Extract command and arguments from message text
 * @param {string} text - The message text
 * @returns {Object} - Object containing command and args
 */
function extractCommand(text) {
    if (!text || typeof text !== 'string') {
        return { command: null, args: [] };
    }

    const trimmedText = text.trim();
    let usedPrefix = null;
    
    // Find which prefix was used
    for (const prefix of config.bot.prefixes) {
        if (trimmedText.startsWith(prefix)) {
            usedPrefix = prefix;
            break;
        }
    }
    
    if (!usedPrefix) {
        return { command: null, args: [] };
    }
    
    // Remove prefix and split into parts
    const withoutPrefix = trimmedText.slice(usedPrefix.length);
    const parts = withoutPrefix.trim().split(/\s+/);
    
    if (parts.length === 0 || !parts[0]) {
        return { command: null, args: [] };
    }
    
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);
    
    return { command, args, prefix: usedPrefix };
}

/**
 * Check if a user is the bot owner
 * @param {string} jid - User JID
 * @returns {boolean} - True if user is owner
 */
function isOwner(jid) {
    if (!jid) return false;
    
    // Clean the JID to handle different formats
    const cleanJid = jid.replace('@s.whatsapp.net', '').replace('@c.us', '');
    const ownerNumber = config.bot.owner.replace('@s.whatsapp.net', '').replace('@c.us', '');
    
    return cleanJid === ownerNumber;
}

/**
 * Format phone number to WhatsApp JID format
 * @param {string} phone - Phone number
 * @returns {string} - Formatted JID
 */
function formatPhoneNumber(phone) {
    if (!phone) return null;
    
    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Remove leading zeros
    cleaned = cleaned.replace(/^0+/, '');
    
    // Add country code if not present
    if (!cleaned.startsWith('62') && cleaned.length <= 12) {
        cleaned = '62' + cleaned;
    }
    
    return cleaned + '@s.whatsapp.net';
}

/**
 * Extract phone number from JID
 * @param {string} jid - WhatsApp JID
 * @returns {string} - Phone number
 */
function extractPhoneNumber(jid) {
    if (!jid) return null;
    
    return jid.replace('@s.whatsapp.net', '').replace('@c.us', '');
}

/**
 * Check if JID is a group
 * @param {string} jid - WhatsApp JID
 * @returns {boolean} - True if it's a group
 */
function isGroup(jid) {
    return jid && jid.endsWith('@g.us');
}

/**
 * Format uptime in human readable format
 * @param {number} seconds - Uptime in seconds
 * @returns {string} - Formatted uptime
 */
function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    let result = '';
    if (days > 0) result += `${days}d `;
    if (hours > 0) result += `${hours}h `;
    if (minutes > 0) result += `${minutes}m `;
    result += `${secs}s`;
    
    return result;
}

/**
 * Format bytes in human readable format
 * @param {number} bytes - Size in bytes
 * @returns {string} - Formatted size
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} - Promise that resolves after sleep
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate random string
 * @param {number} length - Length of string
 * @returns {string} - Random string
 */
function generateRandomString(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
}

/**
 * Escape text for WhatsApp markdown
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text
 */
function escapeMarkdown(text) {
    if (!text || typeof text !== 'string') return '';
    
    return text
        .replace(/\*/g, '\\*')
        .replace(/_/g, '\\_')
        .replace(/~/g, '\\~')
        .replace(/`/g, '\\`');
}

/**
 * Create WhatsApp mention format
 * @param {string} jid - User JID to mention
 * @param {string} name - Display name
 * @returns {Object} - WhatsApp mention object
 */
function createMention(jid, name = null) {
    const cleanJid = jid.includes('@') ? jid : jid + '@s.whatsapp.net';
    const displayName = name || extractPhoneNumber(cleanJid);
    
    return {
        text: `@${displayName}`,
        jid: cleanJid
    };
}

/**
 * Validate phone number format
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - True if valid
 */
function isValidPhoneNumber(phone) {
    if (!phone || typeof phone !== 'string') return false;
    
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length >= 10 && cleaned.length <= 15;
}

/**
 * Get current timestamp in ISO format
 * @returns {string} - ISO timestamp
 */
function getCurrentTimestamp() {
    return new Date().toISOString();
}

/**
 * Parse duration string to milliseconds
 * @param {string} duration - Duration string (e.g., '1d', '2h', '30m', '45s')
 * @returns {number} - Duration in milliseconds
 */
function parseDuration(duration) {
    if (!duration || typeof duration !== 'string') return 0;
    
    const units = {
        's': 1000,
        'm': 60 * 1000,
        'h': 60 * 60 * 1000,
        'd': 24 * 60 * 60 * 1000,
        'w': 7 * 24 * 60 * 60 * 1000
    };
    
    const match = duration.match(/^(\d+)([smhdw])$/);
    if (!match) return 0;
    
    const [, amount, unit] = match;
    return parseInt(amount) * (units[unit] || 0);
}

module.exports = {
    isValidCommand,
    extractCommand,
    isOwner,
    formatPhoneNumber,
    extractPhoneNumber,
    isGroup,
    formatUptime,
    formatBytes,
    sleep,
    generateRandomString,
    escapeMarkdown,
    createMention,
    isValidPhoneNumber,
    getCurrentTimestamp,
    parseDuration
};
