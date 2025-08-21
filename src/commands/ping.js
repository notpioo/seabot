const config = require('../../config/config');

module.exports = {
    name: 'ping',
    description: 'Check bot response time and status',
    usage: `${config.bot.prefixes[0]}ping`,
    category: 'utility',
    
    async execute(context) {
        const { reply } = context;
        const startTime = Date.now();
        
        try {
            // Calculate response time
            const responseTime = Date.now() - startTime;
            
            // Get system info
            const uptime = process.uptime();
            const memUsage = process.memoryUsage();
            
            const uptimeString = formatUptime(uptime);
            const memUsageMB = (memUsage.rss / 1024 / 1024).toFixed(2);
            
            const response = `🏓 *Pong!*

⏱️ *Response Time:* ${responseTime}ms
🔄 *Uptime:* ${uptimeString}
💾 *Memory Usage:* ${memUsageMB} MB
🤖 *Bot:* ${config.bot.name} v${config.bot.version}
📅 *Time:* ${new Date().toLocaleString()}

✅ Bot is running smoothly!`;
            
            await reply(response);
            
        } catch (error) {
            await reply('❌ Failed to get ping information');
            throw error;
        }
    }
};

function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    let result = '';
    if (days > 0) result += `${days}d `;
    if (hours > 0) result += `${hours}h `;
    if (minutes > 0) result += `${minutes}m `;
    result += `${secs}s`;
    
    return result;
}
