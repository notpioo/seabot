
const config = require('../config/bot');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const fs = require('fs');
const path = require('path');

async function hitamkanCommand(sock, message, user, args) {
    const from = message.key.remoteJid;
    
    try {
        let imageBuffer = null;

        // Check if message has image attachment
        if (message.message?.imageMessage) {
            console.log('📷 Image found in message');
            imageBuffer = await downloadMediaMessage(message, 'buffer', {});
        }
        // Check if replying to image message
        else if (message.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage) {
            console.log('📷 Replying to image message');
            
            // Create a fake message object for the quoted image
            const quotedMessage = {
                key: {
                    remoteJid: from,
                    id: message.message.extendedTextMessage.contextInfo.stanzaId
                },
                message: message.message.extendedTextMessage.contextInfo.quotedMessage
            };
            
            imageBuffer = await downloadMediaMessage(quotedMessage, 'buffer', {});
        }
        else {
            await sock.sendMessage(from, { 
                text: `❌ *Cara Penggunaan:* .hitamkan

📋 *Metode:*
1. Kirim foto dengan caption .hitamkan
2. Reply foto dengan .hitamkan

💡 *Note:* Bot akan mengubah foto menjadi hitam/gelap.` 
            });
            return;
        }

        if (!imageBuffer) {
            await sock.sendMessage(from, { 
                text: '❌ Gagal mengunduh gambar! Pastikan mengirim foto yang valid.' 
            });
            return;
        }

        // Send loading message
        await sock.sendMessage(from, { 
            text: '🎨 Sedang memproses gambar...' 
        });

        // Save image to local server and serve it via Replit's image server
        console.log('💾 Saving image to local server...');
        
        const fileName = `image_${Date.now()}.jpg`;
        const imagePath = path.join(__dirname, '..', 'public', 'images', fileName);
        
        // Ensure directory exists
        const imagesDir = path.join(__dirname, '..', 'public', 'images');
        if (!fs.existsSync(imagesDir)) {
            fs.mkdirSync(imagesDir, { recursive: true });
        }
        
        // Save image to local filesystem
        fs.writeFileSync(imagePath, imageBuffer);
        
        // Create the image URL using Replit's domain
        const replitUrl = process.env.REPL_SLUG ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` : 'http://0.0.0.0:5000';
        const imageUrl = `${replitUrl}/images/${fileName}`;
        
        console.log('✅ Image saved and accessible at:', imageUrl);

        let processedImageUrl = null;
        let apiSource = '';

        // Try BetaBotz API first with URL
        try {
            console.log('🔄 Trying BetaBotz API for hitamkan...');
            console.log('📤 Sending URL to BetaBotz:', imageUrl);
            
            const betabotzUrl = `https://api.betabotz.eu.org/api/maker/jadihitam?url=${encodeURIComponent(imageUrl)}&apikey=${config.betabotzApiKey}`;
            const betabotzResponse = await fetch(betabotzUrl, {
                timeout: 30000,
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            
            const betabotzText = await betabotzResponse.text();
            console.log('BetaBotz raw response:', betabotzText);
            
            if (betabotzResponse.ok) {
                try {
                    const betabotzData = JSON.parse(betabotzText);
                    console.log('BetaBotz parsed response:', JSON.stringify(betabotzData, null, 2));
                    
                    if (betabotzData && (betabotzData.result || betabotzData.url)) {
                        processedImageUrl = betabotzData.result || betabotzData.url;
                        apiSource = 'BetaBotz';
                        console.log('✅ BetaBotz hitamkan API success');
                    } else {
                        console.log('❌ BetaBotz response missing result field');
                    }
                } catch (parseError) {
                    console.log('❌ BetaBotz JSON parse error:', parseError.message);
                }
            } else {
                console.log(`❌ BetaBotz returned ${betabotzResponse.status}: ${betabotzText}`);
            }
        } catch (betabotzError) {
            console.log('❌ BetaBotz failed:', betabotzError.message);
        }

        // Fallback to BotCahX API if BetaBotz failed
        if (!processedImageUrl) {
            try {
                console.log('🔄 Trying BotCahX API fallback...');
                console.log('📤 Sending URL to BotCahX:', imageUrl);
                
                const botcahxUrl = `https://api.botcahx.eu.org/api/maker/jadihitam?url=${encodeURIComponent(imageUrl)}&apikey=${config.botcahxApiKey}`;
                const botcahxResponse = await fetch(botcahxUrl, {
                    timeout: 30000,
                    headers: {
                        'Accept': 'application/json',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });
                
                const botcahxText = await botcahxResponse.text();
                console.log('BotCahX raw response:', botcahxText);
                
                if (botcahxResponse.ok) {
                    try {
                        const botcahxData = JSON.parse(botcahxText);
                        console.log('BotCahX parsed response:', JSON.stringify(botcahxData, null, 2));
                        
                        if (botcahxData && botcahxData.status !== false && (botcahxData.result || botcahxData.url)) {
                            processedImageUrl = botcahxData.result || botcahxData.url;
                            apiSource = 'BotCahX';
                            console.log('✅ BotCahX hitamkan API success');
                        } else {
                            console.log('❌ BotCahX response failed or missing result field');
                        }
                    } catch (parseError) {
                        console.log('❌ BotCahX JSON parse error:', parseError.message);
                    }
                } else {
                    console.log(`❌ BotCahX returned ${botcahxResponse.status}: ${botcahxText}`);
                }
            } catch (botcahxError) {
                console.log('❌ BotCahX failed:', botcahxError.message);
            }
        }

        // Try alternative API endpoint if both primary APIs failed
        if (!processedImageUrl) {
            try {
                console.log('🔄 Trying alternative BetaBotz endpoint...');
                console.log('📤 Sending URL to alternative endpoint:', imageUrl);
                
                const altUrl = `https://api.betabotz.eu.org/api/maker/blackpink?url=${encodeURIComponent(imageUrl)}&apikey=${config.betabotzApiKey}`;
                const altResponse = await fetch(altUrl, {
                    timeout: 30000,
                    headers: {
                        'Accept': 'application/json',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });
                
                const altText = await altResponse.text();
                console.log('Alternative API raw response:', altText);
                
                if (altResponse.ok) {
                    try {
                        const altData = JSON.parse(altText);
                        console.log('Alternative API parsed response:', JSON.stringify(altData, null, 2));
                        
                        if (altData && (altData.result || altData.url)) {
                            processedImageUrl = altData.result || altData.url;
                            apiSource = 'BetaBotz Alternative';
                            console.log('✅ Alternative API success');
                        } else {
                            console.log('❌ Alternative API response missing result field');
                        }
                    } catch (parseError) {
                        console.log('❌ Alternative API JSON parse error:', parseError.message);
                    }
                } else {
                    console.log(`❌ Alternative API returned ${altResponse.status}: ${altText}`);
                }
            } catch (altError) {
                console.log('❌ Alternative API failed:', altError.message);
            }
        }

        // Cleanup: remove the temporary image file
        try {
            fs.unlinkSync(imagePath);
            console.log('🗑️ Temporary image file cleaned up');
        } catch (cleanupError) {
            console.log('⚠️ Failed to cleanup temporary file:', cleanupError.message);
        }

        // If still no processed image URL, show error
        if (!processedImageUrl) {
            console.log('❌ All API attempts failed');
            await sock.sendMessage(from, { 
                text: `❌ Gagal memproses gambar!

🔍 *Kemungkinan penyebab:*
• BetaBotz API diblokir Cloudflare
• BotCahX API sedang bermasalah (error Gemini)
• Kedua API sedang maintenance
• Format gambar tidak didukung

💡 *Tips:* 
• Coba lagi dalam beberapa menit
• Gunakan gambar dengan format JPG/PNG
• Ukuran gambar tidak terlalu besar

🛠️ *Status API:*
• Primary: BetaBotz (Cloudflare blocked)
• Fallback: BotCahX (Gemini error)` 
            });
            return;
        }

        // Send processed image
        await sock.sendMessage(from, {
            image: { url: processedImageUrl },
            caption: `🎨 *GAMBAR BERHASIL DIHITAMKAN*

✅ *Processed by:* ${apiSource}
🖼️ *Status:* Success
📤 *Hosted via:* Replit Server

💡 *Note:* Gambar telah diubah menjadi efek hitam/gelap.`
        });

    } catch (error) {
        console.error('Error in hitamkan command:', error);
        
        let errorMessage = '❌ Gagal memproses gambar!';
        
        if (error.message && error.message.includes('download')) {
            errorMessage = '📥 Gagal mengunduh gambar dari pesan!';
        } else if (error.message && error.message.includes('timeout')) {
            errorMessage = '⏳ Request timeout, coba lagi nanti!';
        }
        
        await sock.sendMessage(from, { 
            text: errorMessage + '\n\nCara: Kirim foto dengan .hitamkan atau reply foto dengan .hitamkan' 
        });
    }
}

module.exports = hitamkanCommand;
