async function hidetagCommand(sock, message, user, args) {
    const from = message.key.remoteJid;
    
    try {
        // Check if command is used in a group
        if (!from.endsWith('@g.us')) {
            await sock.sendMessage(from, { 
                text: '❌ Command ini hanya bisa digunakan di grup!' 
            });
            return;
        }

        // Get text to send
        const text = args.join(' ');
        
        if (!text || text.trim() === '') {
            await sock.sendMessage(from, { 
                text: `❌ *Cara Penggunaan:* .hidetag <pesan>

📋 *Contoh:* .hidetag Halo semua! Ada pengumuman penting

💡 *Note:* Semua member grup akan di-mention secara tersembunyi.` 
            });
            return;
        }

        // Get group metadata to get all participants
        const groupMetadata = await sock.groupMetadata(from);
        const participants = groupMetadata.participants;
        
        if (!participants || participants.length === 0) {
            await sock.sendMessage(from, { 
                text: '❌ Tidak bisa mendapatkan daftar member grup!' 
            });
            return;
        }

        // Create mentions array with all participants
        const mentions = participants.map(participant => participant.id);
        
        console.log(`📧 Hidetag command used in group: ${groupMetadata.subject}`);
        console.log(`👥 Mentioning ${mentions.length} participants`);

        // Send message with hidden mentions
        await sock.sendMessage(from, {
            text: text,
            mentions: mentions
        });

    } catch (error) {
        console.error('Error in hidetag command:', error);
        
        let errorMessage = '❌ Gagal mengirim hidetag!';
        
        if (error.message && error.message.includes('not-authorized')) {
            errorMessage = '❌ Bot tidak memiliki izin untuk mengakses data grup!';
        } else if (error.message && error.message.includes('group')) {
            errorMessage = '❌ Terjadi error saat mengakses grup!';
        }
        
        await sock.sendMessage(from, { 
            text: errorMessage + '\n\nContoh: .hidetag Halo semua!' 
        });
    }
}

module.exports = hidetagCommand;