
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
            let menuContent = null;
            
            // Try to get menu content from database
            if (Menu && Menu.sequelize && typeof Menu.getMenuContent === 'function') {
                try {
                    menuContent = await Menu.getMenuContent();
                    console.log('Menu content retrieved from database');
                } catch (dbError) {
                    console.warn('Database menu retrieval failed:', dbError.message);
                }
            } else {
                console.warn('Menu model not properly initialized, using fallback');
            }
            
            // Use database content if available, otherwise use default
            const finalMenu = menuContent || Menu.getDefaultContent();
            
            await reply(finalMenu);
            
        } catch (error) {
            console.error('Error in menu command:', error);
            
            // Ultimate fallback
            const fallbackMenu = `🤖 *SeaBot Menu*

📋 *Available Commands:*
• .ping - Check bot status
• .menu - Show this menu

⚙️ *Bot Status:* Online ✅

Thank you for using SeaBot! 🙏`;
            
            await reply(fallbackMenu);
        }
    }
};
