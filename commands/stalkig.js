
const config = require('../config/bot');

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

    const username = args[0].replace('@', ''); // Remove @ if user includes it
    
    try {
        // Send loading message
        await sock.sendMessage(from, { 
            text: '🔍 Mencari informasi Instagram user...' 
        });

        // Try BetaBotz API first, then fallback to BotCahX API
        let response;
        let apiSource = '';
        
        // First attempt: BetaBotz API
        try {
            console.log('🔄 Trying BetaBotz API for Instagram...');
            const betabotzUrl = `https://api.betabotz.eu.org/api/stalk/ig?apikey=${config.betabotzApiKey}&username=${username}`;
            
            const betabotzResponse = await fetch(betabotzUrl, {
                timeout: 15000,
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            
            if (betabotzResponse.ok) {
                response = await betabotzResponse.json();
                if (response && response.code === 200 && response.result) {
                    apiSource = 'BetaBotz';
                    console.log('✅ BetaBotz Instagram API success');
                } else {
                    throw new Error('BetaBotz returned invalid response');
                }
            } else {
                throw new Error(`BetaBotz returned ${betabotzResponse.status}`);
            }
            
        } catch (betabotzError) {
            console.log('❌ BetaBotz failed:', betabotzError.message);
            console.log('🔄 Trying BotCahX API fallback...');
            
            try {
                // Fallback: BotCahX API
                const botcahxUrl = `https://api.botcahx.eu.org/api/stalk/ig?apikey=${config.botcahxApiKey}&username=${username}`;
                
                const botcahxResponse = await fetch(botcahxUrl, {
                    timeout: 15000,
                    headers: {
                        'Accept': 'application/json',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });
                
                if (botcahxResponse.ok) {
                    response = await botcahxResponse.json();
                    if (response && response.status === true && response.result) {
                        apiSource = 'BotCahX';
                        console.log('✅ BotCahX Instagram API success');
                    } else {
                        throw new Error('BotCahX returned invalid response');
                    }
                } else {
                    throw new Error(`BotCahX returned ${botcahxResponse.status}`);
                }
                
            } catch (botcahxError) {
                console.log('❌ BotCahX also failed:', botcahxError.message);
                throw new Error('Both BetaBotz and BotCahX APIs failed');
            }
        }

        console.log(`Instagram API Response from ${apiSource}:`, JSON.stringify(response, null, 2));

        // Process response
        if (response && response.result) {
            const data = response.result;
            
            // Handle different API response structures
            const profileData = {
                username: data.username || data.user || username,
                fullName: data.fullName || data.full_name || data.name || 'Tidak tersedia',
                biography: data.biography || data.bio || data.description || 'Tidak ada bio',
                followers: data.followers || data.follower_count || data.edge_followed_by?.count || 0,
                following: data.following || data.following_count || data.edge_follow?.count || 0,
                posts: data.posts || data.postsCount || data.media_count || data.edge_owner_to_timeline_media?.count || 0,
                isPrivate: data.isPrivate || data.is_private || false,
                isVerified: data.isVerified || data.is_verified || false,
                profilePicture: data.profilePicture || data.photoUrl || data.profile_pic_url || data.profile_pic_url_hd
            };
            
            const caption = `📷 *INSTAGRAM PROFILE INFO*

👤 *Username:* @${profileData.username}
📝 *Nama:* ${profileData.fullName}
📖 *Bio:* ${profileData.biography}
👥 *Pengikut:* ${profileData.followers.toLocaleString()}
➕ *Mengikuti:* ${profileData.following.toLocaleString()}
📱 *Posts:* ${profileData.posts.toLocaleString()}
🔒 *Akun Pribadi:* ${profileData.isPrivate ? 'Ya' : 'Tidak'}
✅ *Terverifikasi:* ${profileData.isVerified ? 'Ya' : 'Tidak'}

🔗 *Profile:* https://instagram.com/${username}`;

            // Send profile picture if available
            if (profileData.profilePicture) {
                try {
                    await sock.sendMessage(from, {
                        image: { url: profileData.profilePicture },
                        caption: caption
                    });
                } catch (imageError) {
                    console.log('Failed to send profile picture:', imageError);
                    await sock.sendMessage(from, { 
                        text: caption 
                    });
                }
            } else {
                await sock.sendMessage(from, { 
                    text: caption 
                });
            }

        } else {
            await sock.sendMessage(from, { 
                text: `❌ User Instagram tidak ditemukan!

🔍 *Kemungkinan penyebab:*
• Username salah atau tidak ada
• Akun private/tidak aktif
• API sedang maintenance

💡 *Tips:* 
• Pastikan username benar
• Coba tanpa @ symbol
• Contoh: .stalkig not.funn_` 
            });
        }

    } catch (error) {
        console.error('Error in stalkig command:', error);
        
        let errorMessage = '❌ Gagal mengambil data Instagram!';
        
        if (error.message && error.message.includes('fetch')) {
            errorMessage = '🌐 Koneksi bermasalah, coba lagi nanti.';
        } else if (error.message && error.message.includes('timeout')) {
            errorMessage = '⏳ Request timeout, coba lagi nanti.';
        }
        
        await sock.sendMessage(from, { 
            text: errorMessage + '\n\nContoh: .stalkig not.funn_' 
        });
    }
}

module.exports = stalkigCommand;
