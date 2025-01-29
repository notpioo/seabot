const menuCommand = require('../commands/menuCommand');

const handleCommand = async (msg, client) => {
  const command = msg.body.trim().toLowerCase();
  
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