
const config = require('../../config/config');
const Menu = require('../database/models/Menu');

module.exports = {
    name: 'menu',
    description: 'Show bot menu with available commands and features',
    usage: `${config.bot.prefixes[0]}menu`,
    category: 'general',
    cooldown: 3,
    
    async execute(context) {
        const { reply } = context;
        
        try {
            // Get menu content from database
            const menuContent = await Menu.getMenuContent();
            
            await reply(menuContent);
            
        } catch (error) {
            console.error('Error in menu command:', error);
            
            // Fallback to default menu if error occurs
            const fallbackMenu = `🤖 *Bot Menu*

📋 *Available Commands:*
• .ping - Check bot status
• .menu - Show this menu

⚙️ *Bot Info:*
• Version: ${config.bot.version}
• Status: Online

Thank you for using our bot! 🙏`;
            
            await reply(fallbackMenu);
        }
    }
};
