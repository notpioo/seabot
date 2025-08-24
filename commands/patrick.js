
const config = require('../config/bot');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function patrickCommand(sock, message, user, args) {
    const from = message.key.remoteJid;
    
    try {
        // Send loading message
        const loadingMessage = await sock.sendMessage(from, { 
            text: '🌟 Generating Patrick sticker...' 
        });

        let stickerBuffer = null;
        let apiSource = '';

        // Try BotCahX API first
        try {
            console.log('🔄 Trying BotCahX API for Patrick sticker...');
            const botcahxUrl = `https://api.botcahx.eu.org/api/sticker/patrick?apikey=${config.botcahxApiKey}`;
            
            const botcahxResponse = await fetch(botcahxUrl, {
                timeout: 20000,
                headers: {
                    'Accept': '*/*',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });
            
            if (botcahxResponse.ok) {
                const contentType = botcahxResponse.headers.get('content-type') || '';
                console.log('BotCahX content-type:', contentType);
                
                // Check if it's an image response (direct binary)
                if (contentType.includes('image') || contentType.includes('webp') || contentType.includes('jpeg') || contentType.includes('png')) {
                    // Fix: Use arrayBuffer() instead of buffer() for fetch API
                    const arrayBuffer = await botcahxResponse.arrayBuffer();
                    stickerBuffer = Buffer.from(arrayBuffer);
                    apiSource = 'BotCahX (Direct Image)';
                    console.log('✅ BotCahX returned direct image, size:', stickerBuffer.length);
                    
                    // Save image temporarily for processing
                    const tempDir = path.join(__dirname, '../public/images');
                    if (!fs.existsSync(tempDir)) {
                        fs.mkdirSync(tempDir, { recursive: true });
                    }
                    
                    const tempFileName = `patrick_${Date.now()}.jpg`;
                    const tempFilePath = path.join(tempDir, tempFileName);
                    fs.writeFileSync(tempFilePath, stickerBuffer);
                    console.log('💾 Image saved temporarily:', tempFileName);
                    
                } else {
                    // Try to parse as JSON if not direct image
                    try {
                        const botcahxText = await botcahxResponse.text();
                        console.log('BotCahX response text:', botcahxText.substring(0, 200));
                        
                        const botcahxData = JSON.parse(botcahxText);
                        if (botcahxData && botcahxData.status !== false && (botcahxData.result || botcahxData.url)) {
                            const imageUrl = botcahxData.result || botcahxData.url;
                            console.log('📥 Downloading from BotCahX URL:', imageUrl);
                            
                            const imageResponse = await fetch(imageUrl);
                            if (imageResponse.ok) {
                                const imageArrayBuffer = await imageResponse.arrayBuffer();
                                stickerBuffer = Buffer.from(imageArrayBuffer);
                                apiSource = 'BotCahX (URL)';
                                console.log('✅ Downloaded from BotCahX URL');
                            }
                        }
                    } catch (parseError) {
                        console.log('❌ BotCahX JSON parse failed:', parseError.message);
                        // Try as raw binary anyway
                        const arrayBuffer = await botcahxResponse.arrayBuffer();
                        stickerBuffer = Buffer.from(arrayBuffer);
                        apiSource = 'BotCahX (Raw Binary)';
                    }
                }
            } else {
                console.log(`❌ BotCahX returned ${botcahxResponse.status}`);
            }
        } catch (botcahxError) {
            console.log('❌ BotCahX failed:', botcahxError.message);
        }

        // Fallback to BetaBotz if BotCahX failed
        if (!stickerBuffer || stickerBuffer.length === 0) {
            try {
                console.log('🔄 Trying BetaBotz API fallback...');
                const betabotzUrl = `https://api.betabotz.eu.org/api/sticker/patrick?apikey=${config.betabotzApiKey}`;
                
                const betabotzResponse = await fetch(betabotzUrl, {
                    timeout: 20000,
                    headers: {
                        'Accept': 'application/json',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });
                
                if (betabotzResponse.ok) {
                    const contentType = betabotzResponse.headers.get('content-type') || '';
                    
                    // Check if BetaBotz returns direct image
                    if (contentType.includes('image')) {
                        const arrayBuffer = await betabotzResponse.arrayBuffer();
                        stickerBuffer = Buffer.from(arrayBuffer);
                        apiSource = 'BetaBotz (Direct Image)';
                        console.log('✅ BetaBotz returned direct image');
                    } else {
                        // Parse as JSON
                        const betabotzText = await betabotzResponse.text();
                        
                        // Skip Cloudflare challenge pages
                        if (!betabotzText.includes('<!DOCTYPE html>') && !betabotzText.includes('Cloudflare')) {
                            try {
                                const betabotzData = JSON.parse(betabotzText);
                                if (betabotzData && (betabotzData.result || betabotzData.url)) {
                                    const imageUrl = betabotzData.result || betabotzData.url;
                                    console.log('📥 Downloading from BetaBotz URL:', imageUrl);
                                    
                                    const imageResponse = await fetch(imageUrl);
                                    if (imageResponse.ok) {
                                        const imageArrayBuffer = await imageResponse.arrayBuffer();
                                        stickerBuffer = Buffer.from(imageArrayBuffer);
                                        apiSource = 'BetaBotz (URL)';
                                        console.log('✅ Downloaded from BetaBotz URL');
                                    }
                                }
                            } catch (parseError) {
                                console.log('❌ BetaBotz JSON parse error:', parseError.message);
                            }
                        } else {
                            console.log('❌ BetaBotz returned Cloudflare challenge page');
                        }
                    }
                } else {
                    console.log(`❌ BetaBotz returned ${betabotzResponse.status}`);
                }
            } catch (betabotzError) {
                console.log('❌ BetaBotz failed:', betabotzError.message);
            }
        }

        // Delete loading message
        await sock.sendMessage(from, {
            delete: loadingMessage.key
        });

        // If no sticker obtained, show error
        if (!stickerBuffer || stickerBuffer.length === 0) {
            console.log('❌ All API attempts failed or returned empty buffer');
            await sock.sendMessage(from, { 
                text: `❌ Maaf, gagal generate Patrick sticker!

🔍 **Kemungkinan penyebab:**
• Kedua API sedang bermasalah
• Koneksi internet tidak stabil
• Server API sedang maintenance

💡 **Solusi:**
• Coba lagi dalam beberapa menit
• Pastikan koneksi internet stabil

⚡ **Cara pakai:** .patrick` 
            });
            return;
        }

        // Process and optimize the sticker
        try {
            console.log('🔄 Processing sticker buffer, size:', stickerBuffer.length);
            
            // Create proper WebP sticker with optimal settings
            const processedSticker = await sharp(stickerBuffer)
                .resize(512, 512, { 
                    fit: 'contain',
                    background: { r: 255, g: 255, b: 255, alpha: 0 },
                    withoutEnlargement: false
                })
                .webp({ 
                    quality: 90,
                    effort: 4,
                    lossless: false
                })
                .toBuffer();

            console.log(`✅ Sticker processed successfully! Final size: ${processedSticker.length} bytes`);

            // Save processed sticker for future reference
            const stickerDir = path.join(__dirname, '../public/images');
            const stickerFileName = `patrick_sticker_${Date.now()}.webp`;
            const stickerFilePath = path.join(stickerDir, stickerFileName);
            fs.writeFileSync(stickerFilePath, processedSticker);
            console.log('💾 Processed sticker saved:', stickerFileName);

            // Send the Patrick sticker
            await sock.sendMessage(from, {
                sticker: processedSticker,
                mimetype: 'image/webp'
            });

            console.log(`🎉 Patrick sticker sent successfully via ${apiSource}`);

            // Clean up old temporary files (keep only recent 10 files)
            setTimeout(() => {
                try {
                    const files = fs.readdirSync(stickerDir)
                        .filter(file => file.startsWith('patrick_'))
                        .map(file => ({
                            name: file,
                            path: path.join(stickerDir, file),
                            time: fs.statSync(path.join(stickerDir, file)).mtime.getTime()
                        }))
                        .sort((a, b) => b.time - a.time);
                    
                    // Keep only 10 most recent files
                    files.slice(10).forEach(file => {
                        fs.unlinkSync(file.path);
                        console.log('🗑️ Cleaned up old file:', file.name);
                    });
                } catch (cleanupError) {
                    console.log('⚠️ Cleanup error:', cleanupError.message);
                }
            }, 5000);

        } catch (processError) {
            console.error('❌ Error processing sticker:', processError);
            await sock.sendMessage(from, { 
                text: `❌ Gagal memproses sticker Patrick!

🔍 **Detail error:** ${processError.message}

💡 **Solusi:**
• Coba lagi dalam beberapa menit
• API mungkin mengirim format gambar yang tidak valid

⚡ **Cara pakai:** .patrick` 
            });
        }

    } catch (error) {
        console.error('❌ Error in Patrick command:', error);
        
        let errorMessage = '❌ Terjadi kesalahan saat membuat Patrick sticker!';
        
        if (error.message) {
            if (error.message.includes('timeout')) {
                errorMessage = '⏳ Timeout! Server terlalu lama merespon, coba lagi nanti.';
            } else if (error.message.includes('fetch')) {
                errorMessage = '🌐 Masalah koneksi ke server, coba lagi nanti.';
            }
        }
        
        await sock.sendMessage(from, { 
            text: errorMessage + '\n\n💡 **Cara pakai:** .patrick'
        });
    }
}

module.exports = patrickCommand;
