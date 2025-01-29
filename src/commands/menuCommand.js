const handleMenu = async (msg, client) => {
    const menu = `*📜 DAFTAR MENU*
    
  *.menu* - Menampilkan daftar perintah
    
  More commands coming soon...`;
  
    try {
        await client.sendMessage(msg.key.remoteJid, { 
            text: menu,
            // Add these parameters to help with message delivery
            messageType: 'text',
            userJid: client.user.id
        }, {
            // Add sending options
            quoted: msg,
            ephemeralExpiration: 86400
        });
    } catch (error) {
        console.error('Error sending menu:', error);
        // Retry sending with basic configuration
        await client.sendMessage(msg.key.remoteJid, { 
            text: menu 
        });
    }
};

module.exports = handleMenu;