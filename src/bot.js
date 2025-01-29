const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const connectDB = require('./config/database');
const handleCommand = require('./handlers/commandHandler');
const messageHandler = require('./handlers/messageHandler');
require('dotenv').config();

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
  
  const client = makeWASocket({
    printQRInTerminal: false, // ubah ke false
    qr: true // tambahkan ini untuk mendapatkan QR dalam format gambar
  });
  
  // Tambahkan handler untuk QR
  client.ev.on('qr', qr => {
    // Generate QR code sebagai gambar
    qrcode.toFile('qr.png', qr, function (err) {
      if (err) throw err;
      console.log('QR Code saved as qr.png');
    });
  });

  client.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === 'open') {
      console.log('Connected to WhatsApp');
    }

    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) {
        connectToWhatsApp();
      }
    }
  });

  client.ev.on('creds.update', saveCreds);

  client.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message) return;

    // Process message with message handler
    await messageHandler(msg, client);
    
    const messageContent = msg.message?.conversation || msg.message?.extendedTextMessage?.text;
    if (!messageContent) return;
    
    // Handle commands
    if (messageContent.startsWith('.')) {
      await handleCommand(msg, client);
    }
  });
}

// Connect to MongoDB then start the bot
connectDB().then(() => {
  connectToWhatsApp();
});