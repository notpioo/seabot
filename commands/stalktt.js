const config = require('../config/bot');

async function stalkttCommand(sock, message, user, args) {
    const from = message.key.remoteJid;
    
    try {
        if (!args || args.length === 0) {
            await sock.sendMessage(from, { 
                text: `❌ *Cara Penggunaan:* .stalktt <username>

📋 *Contoh:* .stalktt whttss

💡 *Note:* Masukkan username TikTok tanpa @ symbol.` 
            });
            return;
        }

        const username = args[0].replace('@', '');

        // Validate username format
        if (!/^[a-zA-Z0-9._]+$/.test(username)) {
            await sock.sendMessage(from, { 
                text: '❌ Username TikTok tidak valid! Gunakan format yang benar tanpa spasi atau karakter khusus.' 
            });
            return;
        }

        // Send loading message
        await sock.sendMessage(from, { 
            text: '🔍 Mencari informasi TikTok user...' 
        });

        console.log(`🔍 Command: stalktt`);
        console.log(`🔄 Trying BotCahX API for TikTok...`);

        // Use the correct BotCahX endpoint based on the image shown
        const apiUrl = `https://api.botcahx.eu.org/api/stalk/tt?apikey=${config.botcahxApiKey}&username=${username}`;
        
        const response = await fetch(apiUrl, {
            timeout: 15000,
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (!response.ok) {
            console.log(`❌ BotCahX returned ${response.status}`);
            await sock.sendMessage(from, { 
                text: `❌ User TikTok tidak ditemukan!

🔍 *Kemungkinan penyebab:*
• Username salah atau tidak ada
• Akun private/tidak aktif  
• API sedang maintenance

💡 *Tips:* 
• Pastikan username benar
• Coba tanpa @ symbol
• Contoh: .stalktt whttss` 
            });
            return;
        }

        const responseText = await response.text();
        
        // Check if response is HTML (error page)
        if (responseText.startsWith('<!DOCTYPE') || responseText.startsWith('<html')) {
            console.log(`❌ BotCahX returned HTML error page`);
            await sock.sendMessage(from, { 
                text: '❌ API tidak tersedia saat ini, coba lagi nanti!' 
            });
            return;
        }

        const data = JSON.parse(responseText);
        console.log(`BotCahX TikTok API Response:`, JSON.stringify(data, null, 2));

        // Check response format based on the example provided
        if (!data || !data.status || data.code !== 200 || !data.result) {
            console.log(`❌ BotCahX returned invalid response format`);
            await sock.sendMessage(from, { 
                text: '❌ Data TikTok tidak ditemukan atau format response tidak valid!' 
            });
            return;
        }

        console.log(`✅ BotCahX TikTok API success`);

        // Parse response data according to the exact format shown
        const result = data.result;
        
        const profileData = {
            username: result.username || username,
            description: result.description || 'No description',
            likes: result.likes || 0,
            followers: result.followers || 0,
            following: result.following || 0,
            totalPosts: result.totalPosts || 0,
            profile: result.profile
        };

        const resultText = `🎵 *TIKTOK PROFILE INFO*

👤 *Username:* @${profileData.username}
📝 *Description:* ${profileData.description}
❤️ *Likes:* ${Number(profileData.likes).toLocaleString()}
👥 *Followers:* ${Number(profileData.followers).toLocaleString()}
➕ *Following:* ${Number(profileData.following).toLocaleString()}
📱 *Total Posts:* ${Number(profileData.totalPosts).toLocaleString()}

🔗 *Profile:* https://tiktok.com/@${username}`;

        // Send profile picture if available
        if (profileData.profile) {
            try {
                await sock.sendMessage(from, {
                    image: { url: profileData.profile },
                    caption: resultText
                });
            } catch (imageError) {
                console.log('Failed to send profile picture:', imageError);
                await sock.sendMessage(from, { 
                    text: resultText 
                });
            }
        } else {
            await sock.sendMessage(from, { 
                text: resultText 
            });
        }

    } catch (error) {
        console.error('Error in stalktt command:', error);
        
        let errorMessage = '❌ Gagal mengambil data TikTok!';
        
        if (error.message && error.message.includes('fetch')) {
            errorMessage = '🌐 Koneksi bermasalah, coba lagi nanti.';
        } else if (error.message && error.message.includes('timeout')) {
            errorMessage = '⏳ Request timeout, coba lagi nanti.';
        }
        
        await sock.sendMessage(from, { 
            text: errorMessage + '\n\nContoh: .stalktt whttss' 
        });
    }
}

module.exports = stalkttCommand;