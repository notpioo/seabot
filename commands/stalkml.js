const axios = require('axios');
const { exec } = require('child_process');
const { promisify } = require('util');
const config = require('../config/bot');

const execAsync = promisify(exec);

async function stalkmlCommand(sock, message, user, args) {
    const from = message.key.remoteJid;
    
    try {
        if (!args || args.length < 2) {
            await sock.sendMessage(from, { 
                text: `❌ *Cara Penggunaan:* .stalkml <id> <server>

📋 *Contoh Server ID:*
• Server 2001-3000: ID Indonesia
• Server 9001-9999: ID Advanced  
• Server 10001+: ID Epic/Legend

📌 *Contoh:* .stalkml 268046855 9408

💡 *Note:* Masukkan User ID dan Server ID Mobile Legends kamu.` 
            });
            return;
        }

        const userId = args[0];
        const serverId = args[1];

        // Validate input format
        if (!/^\d+$/.test(userId) || !/^\d+$/.test(serverId)) {
            await sock.sendMessage(from, { 
                text: '❌ User ID dan Server ID harus berupa angka!' 
            });
            return;
        }

        // Send loading message
        await sock.sendMessage(from, { 
            text: '🔍 Mencari informasi player Mobile Legends...' 
        });

        // Try BetaBotz API first, then fallback to BotCahX API
        let response;
        let apiSource = '';
        
        // First attempt: BetaBotz API
        try {
            console.log('🔄 Trying BetaBotz API...');
            const betabotzUrl = `https://api.betabotz.eu.org/api/stalk/ml-v2?apikey=${config.betabotzApiKey}&id=${userId}&server=${serverId}`;
            
            // Use simple fetch for BetaBotz
            const betabotzResponse = await fetch(betabotzUrl, {
                timeout: 15000,
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            
            if (betabotzResponse.ok) {
                response = await betabotzResponse.json();
                if (response && response.result && response.result.success) {
                    apiSource = 'BetaBotz';
                    console.log('✅ BetaBotz API success');
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
                const botcahxUrl = `https://api.botcahx.eu.org/api/stalk/ml-v2?apikey=${config.botcahxApiKey}&id=${userId}&server=${serverId}`;
                
                const botcahxResponse = await fetch(botcahxUrl, {
                    timeout: 15000,
                    headers: {
                        'Accept': 'application/json',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });
                
                if (botcahxResponse.ok) {
                    response = await botcahxResponse.json();
                    if (response && response.status === true && response.result && response.result.success) {
                        apiSource = 'BotCahX';
                        console.log('✅ BotCahX API success');
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

        console.log(`ML API Response from ${apiSource}:`, JSON.stringify(response, null, 2));

        // Process response based on API source
        if (response) {
            let nickname = 'Unknown';
            let userId_display = userId;
            let serverId_display = serverId;
            let country = 'Unknown';
            let shopInfo = '';
            
            if ((apiSource === 'BetaBotz' || apiSource === 'BotCahX') && response.result && response.result.success && response.result.data) {
                // Both APIs now use the same format (ml-v2)
                const data = response.result.data;
                const stalkInfo = data.stalk_info;
                
                // Parse stalk_data to extract player information
                const stalkData = stalkInfo.stalk_data;
                const lines = stalkData.split('\n');
                
                for (const line of lines) {
                    if (line.includes('In-Game Nickname:')) {
                        nickname = line.split('In-Game Nickname: ')[1] || 'Unknown';
                    }
                    if (line.includes('Country:')) {
                        country = line.split('Country: ')[1] || 'Unknown';
                    }
                }
                
                userId_display = stalkInfo.user_id;
                serverId_display = stalkInfo.region;

                // Get shop data summary
                const shopData = stalkInfo.shop_data;
                if (shopData) {
                    if (shopData.diamond) {
                        shopInfo += `💎 Diamond Packages: ${shopData.diamond.total_goods} items\n`;
                    }
                    if (shopData.event) {
                        shopInfo += `🎉 Event Packages: ${shopData.event.total_goods} items\n`;
                    }
                }

                // Get categorized shop summary
                const categorizedShop = data.categorized_shop;
                if (categorizedShop) {
                    const weeklyPass = categorizedShop.weeklyPass;
                    const diamondPacks = categorizedShop.diamondPacks;
                    const firstCharge = categorizedShop.firstCharge;
                    
                    if (weeklyPass && weeklyPass.items.length > 0) {
                        shopInfo += `📅 ${weeklyPass.name}: ${weeklyPass.items.length} items\n`;
                    }
                    if (diamondPacks && diamondPacks.items.length > 0) {
                        shopInfo += `💳 ${diamondPacks.name}: ${diamondPacks.items.length} items\n`;
                    }
                    if (firstCharge && firstCharge.items.length > 0) {
                        shopInfo += `🎁 ${firstCharge.name}: ${firstCharge.items.length} items\n`;
                    }
                }
            }

            const resultText = `🎮 *MOBILE LEGENDS PLAYER INFO*

👤 *Nickname:* ${nickname}
🆔 *User ID:* ${userId_display}
🌐 *Server ID:* ${serverId_display}  
🌍 *Country:* ${country}`;

            await sock.sendMessage(from, { 
                text: resultText 
            });

        } else {
            await sock.sendMessage(from, { 
                text: `❌ Player tidak ditemukan!

🔍 *Kemungkinan penyebab:*
• User ID atau Server ID salah
• Player tidak ada atau tidak aktif
• API sedang maintenance

💡 *Tips:* 
• Pastikan ID dan Server benar
• Coba gunakan ID dan Server yang valid
• Contoh: .stalkml 268046855 9408` 
            });
        }

    } catch (error) {
        console.error('Error in stalkml command:', error);
        
        let errorMessage = '❌ Gagal mengambil data player Mobile Legends!';
        
        if (error.message && error.message.includes('fetch')) {
            errorMessage = '🌐 Koneksi bermasalah, coba lagi nanti.';
        } else if (error.message && error.message.includes('timeout')) {
            errorMessage = '⏳ Request timeout, coba lagi nanti.';
        }
        
        await sock.sendMessage(from, { 
            text: errorMessage + '\n\nContoh: .stalkml 268046855 9408' 
        });
    }
}

module.exports = stalkmlCommand;