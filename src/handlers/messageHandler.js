const User = require('../models/userModel');

const messageHandler = async (msg, client) => {
  try {
    const sender = msg.key.remoteJid;
    
    // Skip if message is from status broadcast
    if (sender === 'status@broadcast') return;
    
    // Get or create user in database
    let user = await User.findOne({ jid: sender });
    if (!user) {
      const pushName = msg.pushName || 'User';
      user = await User.create({
        jid: sender,
        name: pushName
      });
    }

    // Update commands used count if message is a command
    const messageContent = msg.message?.conversation || msg.message?.extendedTextMessage?.text;
    if (messageContent?.startsWith('.')) {
      user.commands_used += 1;
      await user.save();
    }

    // Handle group messages
    const isGroup = sender.endsWith('@g.us');
    if (isGroup) {
      // Add group-specific handling here if needed
      return;
    }

    // Handle private messages
    if (!isGroup) {
      // Add private chat specific handling here if needed
    }

  } catch (error) {
    console.error('Error in message handler:', error);
  }
};

module.exports = messageHandler;