const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const connectDB = require('./config/database');
const handleCommand = require('./handlers/commandHandler');
const messageHandler = require('./handlers/messageHandler');
const fs = require('fs');
require('dotenv').config();

// Pastikan direktori auth_info ada
const AUTH_FOLDER = './auth_info';
if (!fs.existsSync(AUTH_FOLDER)) {
    fs.mkdirSync(AUTH_FOLDER, { recursive: true });
}

async function connectToWhatsApp() {
    try {
        // Pastikan useMultiFileAuthState mengembalikan nilai
        const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);
        
        if (!state) {
            console.error('Failed to get auth state');
            return;
        }

        const client = makeWASocket({
            printQRInTerminal: true,
            auth: state,
            defaultQueryTimeoutMs: undefined // Tambahkan ini untuk menghindari timeout
        });

        client.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;

            if (connection === 'open') {
                console.log('Connected to WhatsApp');
            }

            if (connection === 'close') {
                const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
                console.log('connection closed due to ', lastDisconnect?.error, ', reconnecting ', shouldReconnect);
                if (shouldReconnect) {
                    connectToWhatsApp();
                }
            }
        });

        client.ev.on('creds.update', saveCreds);

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
        // Reconnect after delay
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