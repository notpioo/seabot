/**
 * Check if message starts with valid prefix
 */
function isValidPrefix(text, prefixes) {
    return prefixes.some(prefix => text.startsWith(prefix));
}

/**
 * Extract command and arguments from message
 */
function extractCommand(text, prefixes) {
    // Find which prefix was used
    const usedPrefix = prefixes.find(prefix => text.startsWith(prefix));
    if (!usedPrefix) return { command: null, args: [] };

    // Remove prefix and split into command and args
    const withoutPrefix = text.slice(usedPrefix.length).trim();
    const parts = withoutPrefix.split(/\s+/);
    const command = parts[0]?.toLowerCase();
    const args = parts.slice(1);

    return { command, args };
}

/**
 * Format number with commas
 */
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Get time difference in readable format
 */
function getTimeDiff(date) {
    const now = new Date();
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day(s) ago`;
    if (hours > 0) return `${hours} hour(s) ago`;
    if (minutes > 0) return `${minutes} minute(s) ago`;
    return `${seconds} second(s) ago`;
}

/**
 * Sanitize JID (WhatsApp ID)
 */
function sanitizeJid(jid) {
    return jid.split('@')[0] + '@s.whatsapp.net';
}

module.exports = {
    isValidPrefix,
    extractCommand,
    formatNumber,
    getTimeDiff,
    sanitizeJid
};
