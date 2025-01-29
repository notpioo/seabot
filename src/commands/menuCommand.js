const handleMenu = async (msg, client) => {
    const menu = `*📜 DAFTAR MENU*
    
  *.menu* - Menampilkan daftar perintah

  request fitur? tag aja ya
    
  More commands coming soon...`;
  
    await client.sendMessage(msg.key.remoteJid, { text: menu });
  };
  
  module.exports = handleMenu;