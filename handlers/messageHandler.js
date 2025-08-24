const config = require('../config/bot');
const { getUserInfo, updateUserActivity } = require('../middleware/userMiddleware');
const { checkLimit, useLimit } = require('../services/limitService');
const { isValidPrefix, extractCommand, sanitizeJid } = require('../utils/helpers');

// Import commands
const pingCommand = require('../commands/ping');
const profileCommand = require('../commands/profile');
const bratCommand = require('../commands/brat');
const getlidCommand = require('../commands/getlid');
const linkjidCommand = require('../commands/linkjid');
const gagCommand = require('../commands/gag');
const stalkmlCommand = require('../commands/stalkml');

const commands = {
    'ping': pingCommand,
    'profile': profileCommand,
    'brat': bratCommand,
    'getlid': getlidCommand,
    'linkjid': linkjidCommand,
    'gag': gagCommand,
    'stalkml': stalkmlCommand,
    'stalkig': require('../commands/stalkig'),
    'stalktt': require('../commands/stalktt')
};

async function messageHandler(sock, m) {
    try {
        const message = m.messages[0];
        if (!message.message || message.key.fromMe) return;

        const messageText = message.message.conversation || 
                           message.message.extendedTextMessage?.text || '';
        
        if (!messageText) return;

        // Check if message starts with valid prefix
        if (!isValidPrefix(messageText, config.prefixes)) return;

        const { command, args } = extractCommand(messageText, config.prefixes);
        if (!command || !commands[command]) return;

        const from = message.key.remoteJid;
        const sender = message.key.participant || from;
        
        // Log for debugging LID issues
        console.log(`📧 Message from: ${from}`);
        console.log(`👤 Sender: ${sender}`);
        console.log(`🔍 Command: ${command}`);
        
        // Normalize JID to ensure consistency between private and group chats
        const normalizedJid = sanitizeJid(sender);
        
        // Get or create user info
        const user = await getUserInfo(normalizedJid, message.pushName || 'Unknown');
        
        // Check cooldown
        if (user.lastCommand && Date.now() - user.lastCommand.getTime() < config.commandCooldown) {
            await sock.sendMessage(from, { 
                text: '⏱️ Please wait before using another command!' 
            });
            return;
        }

        // Check limits for non-owner/premium users
        if (user.status === config.statusTypes.BASIC) {
            const canUse = await checkLimit(user._id);
            if (!canUse) {
                await sock.sendMessage(from, { 
                    text: '❌ You have reached your daily limit! Try again tomorrow.' 
                });
                return;
            }
        }

        // Execute command
        const commandFunction = commands[command];
        const startTime = Date.now();
        
        await commandFunction(sock, message, user, args, startTime);

        // Use limit for basic users
        if (user.status === config.statusTypes.BASIC) {
            await useLimit(user._id);
        }

        // Update user activity
        await updateUserActivity(user._id);

    } catch (error) {
        console.error('Error in message handler:', error);
    }
}

module.exports = messageHandler;
