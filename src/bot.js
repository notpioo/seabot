const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const connectDB = require('./config/database');
const handleCommand = require('./handlers/commandHandler');
const messageHandler = require('./handlers/messageHandler');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Use persistent storage directory
const AUTH_FOLDER = process.env.RAILWAY_VOLUME_MOUNT_PATH 
  ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'auth_info')
  : path.join(process.cwd(), 'auth_info');

// Ensure auth directory exists
if (!fs.existsSync(AUTH_FOLDER)) {
    fs.mkdirSync(AUTH_FOLDER, { recursive: true });
}

async function connectToWhatsApp() {
    try {
        const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);
        
        if (!state) {
            console.error('Failed to get auth state');
            return;
        }

        const client = makeWASocket({
            printQRInTerminal: true,
            auth: state,
            defaultQueryTimeoutMs: undefined,
            browser: ['SEABOT', 'Chrome', '1.0.0'],
            // Add these connection options
            connectTimeoutMs: 60_000,
            defaultQueryTimeoutMs: 0,
            keepAliveIntervalMs: 10_000,
            emitOwnEvents: true,
            retryRequestDelayMs: 250
        });

        // Enhanced credentials saving
        client.ev.on('creds.update', async () => {
            try {
                await saveCreds();
                console.log('Credentials updated and saved successfully!');
            } catch (error) {
                console.error('Failed to save credentials:', error);
            }
        });

        // Enhanced connection handling
        client.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;

            if (connection === 'open') {
                console.log('Connected to WhatsApp!');
            }

            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut);
                console.log('Connection closed due to:', lastDisconnect?.error, 'Reconnecting:', shouldReconnect);
                
                if (shouldReconnect) {
                    console.log('Attempting to reconnect...');
                    setTimeout(connectToWhatsApp, 3000);
                } else {
                    console.log('Session ended, please scan QR code to reconnect.');
                    // Only clear auth if explicitly logged out
                    if (lastDisconnect?.error?.output?.statusCode === DisconnectReason.loggedOut) {
                        fs.rmSync(AUTH_FOLDER, { recursive: true, force: true });
                        fs.mkdirSync(AUTH_FOLDER, { recursive: true });
                    }
                }
            }
        });

        // Rest of your event handlers...
        client.ev.on('messages.upsert', async ({ messages }) => {
            const msg = messages[0];
            if (!msg.message) return;

            await messageHandler(msg, client);
            
            const messageContent = msg.message?.conversation || msg.message?.extendedTextMessage?.text;
            if (!messageContent) return;
            
            if (messageContent.startsWith('.')) {
                await handleCommand(msg, client);
            }
        });

    } catch (error) {
        console.error('Error in connectToWhatsApp:', error);
        setTimeout(connectToWhatsApp, 5000);
    }
}

// Connect to MongoDB then start the bot
connectDB().then(() => {
    console.log('Starting WhatsApp connection...');
    connectToWhatsApp();
}).catch(err => {
    console.error('Failed to connect to MongoDB:', err);
});