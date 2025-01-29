const menuCommand = require('../commands/menuCommand');

const handleCommand = async (msg, client) => {
  // Extract message content from the correct path
  const messageContent = msg.message?.conversation || 
                        msg.message?.extendedTextMessage?.text || 
                        msg.message?.imageMessage?.caption ||
                        '';
  
  // Now we can safely use trim() since messageContent is always a string
  const command = messageContent.trim().toLowerCase();
  
  switch(command) {
    case '.menu':
      await menuCommand(msg, client);
      break;
    default:
      // Handle unknown command
      break;
  }
};

module.exports = handleCommand;