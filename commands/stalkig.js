
async function stalkigCommand(sock, message, user, args) {
    const from = message.key.remoteJid;

    if (args.length === 0) {
        await sock.sendMessage(from, { 
            text: `❌ *Cara Penggunaan:* .stalkig <username>

📋 *Contoh:* .stalkig not.funn_

💡 *Note:* Masukkan username Instagram tanpa @ symbol.` 
        });
        return;
    }

    const username = args[0];
    try {
        const response = await fetch(`https://www.instagram.com/${username}/?__a=1`);
        if (!response.ok) {
            let errorMessage = `❌ *Username tidak ditemukan atau terjadi error saat mengambil data.*`;
            if (response.status === 404) {
                errorMessage = `❌ *Username "${username}" tidak ditemukan di Instagram.*`;
            }
            await sock.sendMessage(from, { 
                text: errorMessage + '\n\nContoh: .stalkig not.funn_' 
            });
            return;
        }

        const data = await response.json();
        const profile = data.graphql.user;

        const caption = `
*Nama:* ${profile.full_name}
*Username:* @${profile.username}
*Bio:* ${profile.biography || 'Tidak ada bio'}
*Pengikut:* ${profile.edge_followed_by.count.toLocaleString()}
*Mengikuti:* ${profile.edge_follow.count.toLocaleString()}
*Jumlah Postingan:* ${profile.edge_owner_to_timeline_media.count.toLocaleString()}
*Akun Pribadi:* ${profile.is_private ? 'Ya' : 'Tidak'}
*Terverifikasi:* ${profile.is_verified ? 'Ya' : 'Tidak'}
*Link:* https://www.instagram.com/${profile.username}/
        `;

        await sock.sendMessage(from, { 
            text: caption 
        });

    } catch (error) {
        console.error('Error in stalkig command:', error);
        await sock.sendMessage(from, { 
            text: `❌ *Terjadi kesalahan saat memproses permintaan Anda.*` 
        });
    }
}

module.exports = stalkigCommand;
