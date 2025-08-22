const config = require('../../config/config');
const logger = require('../utils/logger');
const { isValidCommand, extractCommand, isOwner } = require('../utils/helpers');

// Import models with proper initialization and error handling
let User, Stats, Command;
try {
    const userModel = require('../database/models/User');
    const statsModel = require('../database/models/Stats');
    const commandModel = require('../database/models/Command');
    
    User = userModel.User || userModel;
    Stats = statsModel.Stats || statsModel;  
    Command = commandModel.Command || commandModel;
    
    logger.info('Database models imported successfully');
} catch (error) {
    logger.error('Error importing database models:', error);
    // Initialize as empty objects to prevent errors
    User = {};
    Stats = {};
    Command = {};
}

// Import commands
const pingCommand = require('../commands/ping');
const menuCommand = require('../commands/menu');

class MessageHandler {
    constructor() {
        this.commands = new Map();
        this.cooldowns = new Map();
        this.rateLimits = new Map();

        // Load commands asynchronously
        this.loadCommands().catch(error => {
            logger.error('Error in constructor loadCommands:', error);
        });
    }

    async loadCommands() {
        try {
            // Load from database first
            await this.loadCommandsFromDatabase();

            // Register default file-based commands
            this.commands.set('ping', pingCommand);
            this.commands.set('menu', menuCommand);

            logger.info(`Loaded ${this.commands.size} commands`);
        } catch (error) {
            logger.error('Error loading commands:', error);
            // Fallback to file-based commands only
            this.commands.set('ping', pingCommand);
            this.commands.set('menu', menuCommand);
        }
    }

    async loadCommandsFromDatabase() {
        try {
            // Skip database operations if models not properly initialized
            if (!Command || !Command.sequelize || typeof Command.findAll !== 'function') {
                logger.warn('Command model not properly initialized, skipping database commands');
                return;
            }
            
            const dbCommands = await Command.findAll({ where: { isActive: true } });

            for (const cmd of dbCommands) {
                // Check if we have a file-based handler for this command or its base name
                const baseName = cmd.name.replace(/\d+$/, ''); // Remove trailing numbers
                const handler = this.getCommandHandler(cmd.name) || this.getCommandHandler(baseName);

                if (handler) {
                    // Update the command info from database
                    const updatedHandler = {
                        ...handler,
                        name: cmd.name,
                        description: cmd.description,
                        usage: cmd.usage,
                        cooldown: cmd.cooldown,
                        category: cmd.category,
                        ownerOnly: cmd.ownerOnly
                    };

                    this.commands.set(cmd.name, updatedHandler);
                    logger.debug(`Loaded command from database: ${cmd.name} with usage: ${cmd.usage}`);
                }
            }
        } catch (error) {
            logger.error('Error loading commands from database:', error);
        }
    }

    getCommandHandler(commandName) {
        // Map of available command handlers
        const handlers = {
            'ping': pingCommand,
            'menu': menuCommand
        };

        return handlers[commandName];
    }

    async reloadCommands() {
        try {
            // Clear existing commands
            this.commands.clear();

            // Reload from database and files
            await this.loadCommands();

            logger.info('Commands reloaded successfully');
            return true;
        } catch (error) {
            logger.error('Error reloading commands:', error);
            return false;
        }
    }

    async checkAndReloadCommands() {
        try {
            // Skip if Command model not properly initialized  
            if (!Command || !Command.sequelize || typeof Command.findAll !== 'function') {
                return;
            }
            
            // Check if database commands have been updated since last reload
            const dbCommands = await Command.findAll({ where: { isActive: true } });
            let needsReload = false;

            // Check if any database command is different from loaded commands
            for (const dbCmd of dbCommands) {
                const loadedCmd = this.commands.get(dbCmd.name);
                if (!loadedCmd ||
                    loadedCmd.usage !== dbCmd.usage ||
                    loadedCmd.cooldown !== dbCmd.cooldown ||
                    loadedCmd.description !== dbCmd.description) {
                    needsReload = true;
                    break;
                }
            }

            // Check if any loaded command is no longer in database or inactive
            for (const [cmdName, _] of this.commands) {
                if (cmdName !== 'ping') { // Don't check default commands
                    const dbCmd = dbCommands.find(cmd => cmd.name === cmdName);
                    if (!dbCmd || !dbCmd.isActive) {
                        needsReload = true;
                        break;
                    }
                }
            }

            if (needsReload) {
                logger.info('Database commands changed, reloading...');
                await this.reloadCommands();
            }
        } catch (error) {
            logger.error('Error checking command updates:', error);
        }
    }

    async handleMessage(socket, messageUpdate) {
        try {
            const messages = messageUpdate.messages;
            if (!messages || !messages.length) return;

            for (const message of messages) {
                await this.processMessage(socket, message);
            }
        } catch (error) {
            logger.error('Error in message handler:', error);
        }
    }

    async processMessage(socket, message) {
        try {
            // Check if commands need to be reloaded (every 10th message)
            if (Math.random() < 0.1) {
                await this.checkAndReloadCommands();
            }

            // Skip if message is from status broadcast
            if (message.key.remoteJid === 'status@broadcast') return;

            // Skip if message is not from a user or group
            if (!message.key.remoteJid) return;

            // Skip if no message content
            if (!message.message) return;

            // Extract message text
            const messageText = this.extractMessageText(message);
            if (!messageText) return;

            // Check if message starts with a prefix (e.g., '.')
            if (!messageText.startsWith('.')) return;

            // Extract command and arguments
            const parts = messageText.slice(1).split(' ');
            const command = parts[0].toLowerCase();
            const args = parts.slice(1);

            // Get user info
            const sender = message.key.fromMe ? socket.user.id : message.key.participant || message.key.remoteJid;
            const isGroup = message.key.remoteJid.endsWith('@g.us');

            logger.info(`Command received: ${command} from ${sender} in ${isGroup ? 'group' : 'private'}`);

            // Check rate limits
            if (!this.checkRateLimit(sender)) {
                logger.warn(`Rate limit exceeded for user: ${sender}`);
                return;
            }

            // Check cooldown
            const cooldownResult = await this.checkCooldown(sender, command);
            if (!cooldownResult.allowed) {
                logger.debug(`Cooldown active for user: ${sender}, command: ${command}`);

                // Send cooldown message with remaining time
                const remainingTime = Math.ceil(cooldownResult.remainingTime / 1000);
                const cooldownMessage = `⏳ Command masih dalam cooldown!\n⏱️ Tunggu ${remainingTime} detik lagi sebelum menggunakan command ini.`;

                try {
                    await socket.sendMessage(message.key.remoteJid, {
                        text: cooldownMessage
                    }, {
                        quoted: message
                    });
                } catch (error) {
                    logger.error('Failed to send cooldown message:', error);
                }
                return;
            }

            // Update user in database
            await this.updateUser(sender, message);

            // Execute command
            await this.executeCommand(socket, message, command, args);

            // Set cooldown
            this.setCooldown(sender, command);

        } catch (error) {
            logger.error('Error processing message:', error);
        }
    }

    extractMessageText(message) {
        const messageTypes = [
            'conversation',
            'extendedTextMessage',
            'imageMessage',
            'videoMessage',
            'documentMessage'
        ];

        for (const type of messageTypes) {
            if (message.message[type]) {
                if (type === 'conversation') {
                    return message.message[type];
                } else if (message.message[type].caption) {
                    return message.message[type].caption;
                } else if (message.message[type].text) {
                    return message.message[type].text;
                }
            }
        }

        return null;
    }

    async getCommandFromMessage(messageText) {
        try {
            // Skip if Command model not properly initialized
            if (!Command || !Command.sequelize || typeof Command.findAll !== 'function') {
                return null;
            }
            
            // Get all active commands from database
            const commands = await Command.findAll({ where: { isActive: true } });

            for (const cmd of commands) {
                // Check if message matches any command usage pattern
                const usagePattern = cmd.usage.split(' ')[0]; // Get the command part only
                if (messageText.toLowerCase().startsWith(usagePattern.toLowerCase())) {
                    return cmd;
                }
            }

            return null;
        } catch (error) {
            logger.error('Error getting command from message:', error);
            return null;
        }
    }

    extractArgsFromUsage(messageText, usage) {
        const usagePattern = usage.split(' ')[0]; // Get command part like ".ping5"

        // Extract args (everything after the command)
        const args = messageText.slice(usagePattern.length).trim().split(/\s+/).filter(arg => arg.length > 0);

        return args;
    }

    async executeCommand(socket, message, command, args) {
        try {
            // Check command status from shared config file
            const fs = require('fs');
            const path = require('path');
            const configPath = path.join(__dirname, '..', '..', 'config', 'commands.json');
            
            let isCommandActive = true; // Default to true if can't read config
            try {
                const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                const commandConfig = configData.commands.find(c => c.name === command);
                if (commandConfig) {
                    isCommandActive = commandConfig.isActive;
                    logger.debug(`Command ${command} status from config: ${isCommandActive}`);
                }
            } catch (error) {
                logger.warn('Could not read command config, allowing execution by default');
            }
            
            // Block execution if command is disabled in dashboard
            if (!isCommandActive) {
                logger.info(`Command ${command} is disabled via dashboard, ignoring`);
                return;
            }

            // Try to find command handler - first try exact match, then try base name
            let commandHandler = this.commands.get(command);

            if (!commandHandler) {
                // Try to find handler by base name (remove numbers/suffixes)
                const baseName = command.replace(/\d+$/, ''); // Remove trailing numbers
                commandHandler = this.commands.get(baseName);
            }

            if (!commandHandler) {
                logger.debug(`Unknown command handler: ${command}, tried base name: ${command.replace(/\d+$/, '')}`);
                return;
            }
            const context = {
                socket,
                message,
                args,
                sender: message.key.fromMe ? socket.user.id : message.key.participant || message.key.remoteJid,
                chat: message.key.remoteJid,
                isGroup: message.key.remoteJid.endsWith('@g.us'),
                isOwner: isOwner(message.key.fromMe ? socket.user.id : message.key.participant || message.key.remoteJid),
                reply: async (text) => {
                    await socket.sendMessage(message.key.remoteJid, {
                        text: text
                    }, {
                        quoted: message
                    });
                }
            };

            // Execute command with timeout
            const timeout = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Command timeout')), config.commands.timeout)
            );

            await Promise.race([
                commandHandler.execute(context),
                timeout
            ]);

            // Increment command counter in database
            await Stats.incrementCommandCount();
            await Command.incrementUsage(command);
            logger.info(`Command executed: ${command} by ${context.sender}`);

        } catch (error) {
            logger.error(`Error executing command ${command}:`, error);

            // Send error message to user
            try {
                await socket.sendMessage(message.key.remoteJid, {
                    text: `❌ An error occurred while executing the command: ${command}`
                }, {
                    quoted: message
                });
            } catch (sendError) {
                logger.error('Failed to send error message:', sendError);
            }
        }
    }

    checkRateLimit(userId) {
        const now = Date.now();
        const userLimits = this.rateLimits.get(userId) || { requests: [], banned: 0 };

        // Check if user is banned
        if (userLimits.banned && now < userLimits.banned) {
            return false;
        }

        // Remove old requests
        userLimits.requests = userLimits.requests.filter(time => now - time < 60000);

        // Check rate limits
        if (userLimits.requests.length >= config.rateLimit.maxRequestsPerMinute) {
            userLimits.banned = now + config.rateLimit.banDuration;
            this.rateLimits.set(userId, userLimits);
            return false;
        }

        // Add current request
        userLimits.requests.push(now);
        userLimits.banned = 0;
        this.rateLimits.set(userId, userLimits);

        return true;
    }

    async checkCooldown(userId, command) {
        try {
            const now = Date.now();
            const userCooldowns = this.cooldowns.get(userId) || {};
            const lastUsed = userCooldowns[command] || 0;

            // Get cooldown from database (in seconds), convert to milliseconds
            let commandDoc = null;
            if (Command && Command.sequelize && typeof Command.findOne === 'function') {
                try {
                    commandDoc = await Command.findOne({ where: { name: command } });
                } catch (error) {
                    logger.warn('Database cooldown check failed, using default cooldown');
                }
            }
            const cooldownMs = commandDoc ? (commandDoc.cooldown * 1000) : (config.commands.cooldown || 2000);

            const timePassed = now - lastUsed;
            const isAllowed = timePassed >= cooldownMs;
            const remainingTime = isAllowed ? 0 : cooldownMs - timePassed;

            return {
                allowed: isAllowed,
                remainingTime: remainingTime
            };
        } catch (error) {
            logger.error('Error checking cooldown:', error);
            // Fallback to config cooldown
            const now = Date.now();
            const userCooldowns = this.cooldowns.get(userId) || {};
            const lastUsed = userCooldowns[command] || 0;
            const timePassed = now - lastUsed;
            const cooldownMs = config.commands.cooldown || 2000;
            const isAllowed = timePassed >= cooldownMs;
            const remainingTime = isAllowed ? 0 : cooldownMs - timePassed;

            return {
                allowed: isAllowed,
                remainingTime: remainingTime
            };
        }
    }

    setCooldown(userId, command) {
        const now = Date.now();
        const userCooldowns = this.cooldowns.get(userId) || {};
        userCooldowns[command] = now;
        this.cooldowns.set(userId, userCooldowns);
    }

    async updateUser(userId, message) {
        try {
            // Skip user update if User model not properly initialized
            if (!User || !User.sequelize || typeof User.findOrCreate !== 'function') {
                logger.warn('User model not properly initialized, skipping user update');
                return;
            }
            
            const userData = {
                jid: userId,
                lastSeen: new Date()
            };

            // Extract additional user info if available
            if (message.pushName) {
                userData.name = message.pushName;
            }

            // Sequelize way: findOrCreate then update
            const [user, created] = await User.findOrCreate({
                where: { jid: userId },
                defaults: {
                    ...userData,
                    messageCount: 1
                }
            });

            if (!created) {
                await user.update({ 
                    ...userData,
                    messageCount: user.messageCount + 1
                });
            }

        } catch (error) {
            logger.error('Failed to update user:', error);
        }
    }
}

module.exports = MessageHandler;