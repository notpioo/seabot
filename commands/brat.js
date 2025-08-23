const axios = require('axios');
const sharp = require('sharp');
const config = require('../config/bot');

async function bratCommand(sock, message, user, args) {
    const from = message.key.remoteJid;
    
    try {
        // Check if text is provided
        if (!args || args.length === 0) {
            await sock.sendMessage(from, { 
                text: '❌ Please provide text!\n\nUsage: .brat <text>\nExample: .brat hello world' 
            });
            return;
        }

        const text = args.join(' ');
        
        // Send loading message
        const loadingMessage = await sock.sendMessage(from, { 
            text: '⏳ Creating brat sticker...' 
        });

        // Make API request to BetaBotz
        const apiUrl = `https://api.betabotz.eu.org/api/maker/brat`;
        
        // Get response from API
        const response = await axios.get(apiUrl, {
            params: {
                text: text,
                apikey: config.betabotzApiKey
            }
        });

        console.log('API Response:', response.data);

        if (response.status === 200 && response.data.status !== false) {
            let imageBuffer;
            
            // Check if response contains direct URL or base64 data
            if (response.data.result && typeof response.data.result === 'string') {
                // If it's a URL, download the image
                if (response.data.result.startsWith('http')) {
                    const imageResponse = await axios.get(response.data.result, {
                        responseType: 'arraybuffer'
                    });
                    imageBuffer = Buffer.from(imageResponse.data);
                } else {
                    // If it's base64, convert to buffer
                    const base64Data = response.data.result.replace(/^data:image\/[a-z]+;base64,/, '');
                    imageBuffer = Buffer.from(base64Data, 'base64');
                }
            } else {
                // If direct binary data
                const imageResponse = await axios.get(apiUrl, {
                    params: {
                        text: text,
                        apikey: config.betabotzApiKey
                    },
                    responseType: 'arraybuffer'
                });
                imageBuffer = Buffer.from(imageResponse.data);
            }

            // Process image to ensure it's in proper format for sticker
            const processedImage = await sharp(imageBuffer)
                .resize(512, 512, { 
                    fit: 'contain',
                    background: { r: 0, g: 0, b: 0, alpha: 0 }
                })
                .webp()
                .toBuffer();

            // Send the sticker with proper metadata
            await sock.sendMessage(from, {
                sticker: processedImage,
                mimetype: 'image/webp'
            });
            
            // Delete loading message
            await sock.sendMessage(from, {
                delete: loadingMessage.key
            });
        } else {
            // Handle API error
            const errorMessage = response.data?.message || 'Unknown error';
            throw new Error(`API Error: ${errorMessage}`);
        }

    } catch (error) {
        console.error('Error in brat command:', error);
        
        let errorText = '❌ Failed to create brat sticker. Please try again later!';
        
        // Check if it's an API error with specific message
        if (error.message && error.message.includes('API Error:')) {
            errorText = `❌ ${error.message}`;
        } else if (error.response?.data) {
            try {
                const errorData = typeof error.response.data === 'string' 
                    ? JSON.parse(error.response.data) 
                    : error.response.data;
                if (errorData.message) {
                    errorText = `❌ API Error: ${errorData.message}`;
                }
            } catch (parseError) {
                // Keep default error message
            }
        }
        
        await sock.sendMessage(from, { 
            text: errorText
        });
    }
}

module.exports = bratCommand;