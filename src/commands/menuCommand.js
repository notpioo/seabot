const handleMenu = async (msg, client) => {
    const menu = `*📜 DAFTAR MENU*
    
  *.menu* - Menampilkan daftar perintah
    
  More commands coming soon...`;
  
    await client.sendMessage(msg.key.remoteJid, { text: menu });
  };
  
  module.exports = handleMenu;