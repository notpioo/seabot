const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const connectDB = require('./config/database');
const handleCommand = require('./handlers/commandHandler');
const messageHandler = require('./handlers/messageHandler');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Use persistent storage directory in Railway
const AUTH_FOLDER = path.join(process.cwd(), 'auth_info');
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
            // Add these parameters to improve connection stability
            browser: ['SEABOT', 'Chrome', '1.0.0'],
            connectTimeoutMs: 60_000,
            keepAliveIntervalMs: 10_000,
            retryRequestDelayMs: 2000,
            // Add message retry configuration
            patchMessageBeforeSending: (message) => {
                const requiresPatch = !!(
                    message.buttonText || 
                    message.templateButtons || 
                    message.listMessage
                );
                if (requiresPatch) {
                    message = { viewOnceMessage: { message: { messageContextInfo: { deviceListMetadataVersion: 2, deviceListMetadata: {} }, ...message } } };
                }
                return message;
            }
        });

        // Save session immediately when we receive it
        client.ev.on('creds.update', async () => {
            await saveCreds();
            console.log('Credentials updated!');
        });

        client.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;

            if (connection === 'open') {
                console.log('Connected to WhatsApp!');
            }

            if (connection === 'close') {
                const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
                console.log('Connection closed due to ', lastDisconnect?.error, ', reconnecting ', shouldReconnect);
                
                if (shouldReconnect) {
                    connectToWhatsApp();
                } else {
                    console.log('Connection closed. Please scan QR code to reconnect.');
                    // Optional: Clear auth folder if logged out
                    fs.rmSync(AUTH_FOLDER, { recursive: true, force: true });
                    fs.mkdirSync(AUTH_FOLDER, { recursive: true });
                }
            }
        });

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