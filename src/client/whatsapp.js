const { DisconnectReason, useMultiFileAuthState, makeWASocket, fetchLatestBaileysVersion, delay } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const config = require('../../config/config');
const logger = require('../utils/logger');
const MessageHandler = require('../handlers/messageHandler');

class WhatsAppClient {
    constructor() {
        this.socket = null;
        this.authState = null;
        this.messageHandler = new MessageHandler();
        this.qrRetries = 0;
        this.maxQrRetries = 3;
    }

    async initialize() {
        try {
            // Ensure sessions directory exists
            const sessionsDir = path.resolve(config.whatsapp.sessionPath);
            if (!fs.existsSync(sessionsDir)) {
                fs.mkdirSync(sessionsDir, { recursive: true });
                logger.info('Created sessions directory');
            }

            // Get latest Baileys version
            const { version, isLatest } = await fetchLatestBaileysVersion();
            logger.info(`Using Baileys version: ${version}, Latest: ${isLatest}`);

            // Initialize auth state
            const { state, saveCreds } = await useMultiFileAuthState(sessionsDir);
            this.authState = state;

            await this.createSocket(saveCreds);
        } catch (error) {
            logger.error('Failed to initialize WhatsApp client:', error);
            throw error;
        }
    }

    async createSocket(saveCreds) {
        try {
            this.socket = makeWASocket({
                version: (await fetchLatestBaileysVersion()).version,
                auth: this.authState,
                printQRInTerminal: config.whatsapp.printQRInTerminal,
                browser: config.whatsapp.browser,
                defaultQueryTimeoutMs: config.whatsapp.authTimeout,
                logger: require('pino')({ level: 'silent' }) // Suppress Baileys logs
            });

            this.bindEventHandlers(saveCreds);
            logger.info('WhatsApp socket created successfully');
        } catch (error) {
            logger.error('Failed to create WhatsApp socket:', error);
            throw error;
        }
    }

    async requestPairingCode(phoneNumber) {
        if (!this.socket) {
            throw new Error('WhatsApp socket not initialized');
        }
        
        try {
            const code = await this.socket.requestPairingCode(phoneNumber);
            logger.info(`Pairing code for ${phoneNumber}: ${code}`);
            console.log(`\n=== Pairing Code for WhatsApp ===`);
            console.log(`Phone Number: ${phoneNumber}`);
            console.log(`Pairing Code: ${code}`);
            console.log(`Enter this code in WhatsApp > Linked Devices > Link a Device\n`);
            return code;
        } catch (error) {
            logger.error('Failed to request pairing code:', error);
            throw error;
        }
    }

    bindEventHandlers(saveCreds) {
        // Connection update handler
        this.socket.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                // Check if pairing mode is enabled
                if (config.whatsapp.defaultConnectionMode === 'pairing' && config.whatsapp.pairingNumber) {
                    logger.info('Pairing mode enabled, requesting pairing code...');
                    try {
                        await delay(2000); // Wait a bit for socket to be ready
                        await this.requestPairingCode(config.whatsapp.pairingNumber);
                    } catch (error) {
                        logger.error('Failed to request pairing code, falling back to QR:', error.message);
                        // Fall back to QR code
                        if (config.whatsapp.printQRInTerminal) {
                            console.log('\n=== QR Code for WhatsApp Connection ===');
                            qrcode.generate(qr, { small: true });
                            console.log('Scan the QR code above with WhatsApp\n');
                        }
                    }
                } else if (config.whatsapp.printQRInTerminal) {
                    console.log('\n=== QR Code for WhatsApp Connection ===');
                    qrcode.generate(qr, { small: true });
                    console.log('Scan the QR code above with WhatsApp\n');
                }
                
                this.qrRetries++;
                
                if (this.qrRetries >= this.maxQrRetries) {
                    logger.warn('Max QR retries reached, you may need to restart the bot');
                }
            }

            if (connection === 'close') {
                const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
                const errorCode = lastDisconnect?.error?.output?.statusCode;
                
                logger.info('Connection closed:', {
                    shouldReconnect,
                    errorCode,
                    reason: this.getDisconnectReason(errorCode)
                });

                if (shouldReconnect) {
                    logger.info('Attempting to reconnect...');
                    setTimeout(() => this.createSocket(saveCreds), 5000);
                } else {
                    logger.info('Logged out from WhatsApp. Please restart the bot to login again.');
                    process.exit(0);
                }
            } else if (connection === 'open') {
                this.qrRetries = 0;
                logger.info('Connected to WhatsApp successfully!');
                
                // Send initial message to owner
                const ownerJid = config.bot.owner;
                try {
                    await this.socket.sendMessage(ownerJid, {
                        text: `🤖 *${config.bot.name}* is now online!\n\nVersion: ${config.bot.version}\nTime: ${new Date().toLocaleString()}`
                    });
                } catch (error) {
                    logger.warn('Failed to send startup message to owner:', error.message);
                }
            }
        });

        // Credentials update handler
        this.socket.ev.on('creds.update', saveCreds);

        // Message handler
        this.socket.ev.on('messages.upsert', async (m) => {
            try {
                await this.messageHandler.handleMessage(this.socket, m);
            } catch (error) {
                logger.error('Error handling message:', error);
            }
        });

        // Group participants update
        this.socket.ev.on('group-participants.update', (update) => {
            logger.debug('Group participants update:', update);
        });

        // Presence update
        this.socket.ev.on('presence.update', (update) => {
            logger.debug('Presence update:', update);
        });
    }

    getDisconnectReason(statusCode) {
        const reasons = {
            [DisconnectReason.badSession]: 'Bad Session File',
            [DisconnectReason.connectionClosed]: 'Connection Closed',
            [DisconnectReason.connectionLost]: 'Connection Lost',
            [DisconnectReason.connectionReplaced]: 'Connection Replaced',
            [DisconnectReason.loggedOut]: 'Logged Out',
            [DisconnectReason.restartRequired]: 'Restart Required',
            [DisconnectReason.timedOut]: 'Timed Out',
            [DisconnectReason.multideviceMismatch]: 'Multi Device Mismatch'
        };
        
        return reasons[statusCode] || 'Unknown Reason';
    }

    async sendMessage(jid, content) {
        try {
            if (!this.socket) {
                throw new Error('WhatsApp socket not initialized');
            }
            
            return await this.socket.sendMessage(jid, content);
        } catch (error) {
            logger.error('Failed to send message:', error);
            throw error;
        }
    }

    async getProfilePicture(jid) {
        try {
            return await this.socket.profilePictureUrl(jid, 'image');
        } catch (error) {
            logger.debug('Failed to get profile picture:', error.message);
            return null;
        }
    }
}

module.exports = WhatsAppClient;
