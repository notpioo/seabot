
const axios = require('axios');
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

        const username = args[0].replace('@', ''); // Remove @ if user includes it

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

        // Try BetaBotz API first, then fallback to BotCahX API
        let response;
        let apiSource = '';
        
        // First attempt: BetaBotz API
        try {
            console.log('🔄 Trying BetaBotz API for TikTok...');
            const betabotzUrl = `https://api.betabotz.eu.org/api/stalk/tt?apikey=${config.betabotzApiKey}&username=${username}`;
            
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
                    console.log('✅ BetaBotz TikTok API success');
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
                const botcahxUrl = `https://api.botcahx.eu.org/api/stalk/tt?apikey=${config.botcahxApiKey}&username=${username}`;
                
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
                        console.log('✅ BotCahX TikTok API success');
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

        console.log(`TikTok API Response from ${apiSource}:`, JSON.stringify(response, null, 2));

        // Process response
        if (response && response.result) {
            const data = response.result;
            
            const resultText = `🎵 *TIKTOK PROFILE INFO*

👤 *Username:* ${data.username || 'Unknown'}
📝 *Description:* ${data.description || 'No description'}
❤️ *Likes:* ${data.likes || 0}
👥 *Followers:* ${data.followers || 0}
➕ *Following:* ${data.following || 0}
📱 *Total Posts:* ${data.totalPosts || 0}

🔗 *Profile:* https://tiktok.com/@${username}`;

            // Send profile picture if available
            if (data.profile) {
                try {
                    await sock.sendMessage(from, {
                        image: { url: data.profile },
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

        } else {
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
