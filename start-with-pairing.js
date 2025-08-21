const { connectToDatabase } = require('./src/database/connection');
const WhatsAppClient = require('./src/client/whatsapp');
const logger = require('./src/utils/logger');
const config = require('./config/config');

// Function to get phone number from command line arguments
function getPhoneNumberFromArgs() {
    const args = process.argv.slice(2);
    const phoneIndex = args.findIndex(arg => arg === '--phone' || arg === '-p');
    
    if (phoneIndex !== -1 && args[phoneIndex + 1]) {
        return args[phoneIndex + 1];
    }
    
    return null;
}

async function startBotWithPairing() {
    try {
        const phoneNumber = getPhoneNumberFromArgs();
        
        if (!phoneNumber) {
            console.log('\n=== SeaBot - Pairing Mode ===');
            console.log('Usage: node start-with-pairing.js --phone <phone_number>');
            console.log('Example: node start-with-pairing.js --phone 6285709557572');
            console.log('\nNote: Use phone number without + symbol and without spaces');
            process.exit(1);
        }
        
        // Validate phone number format
        const cleanPhone = phoneNumber.replace(/\D/g, '');
        if (cleanPhone.length < 10 || cleanPhone.length > 15) {
            console.error('❌ Invalid phone number format. Please use format: 6285709557572');
            process.exit(1);
        }
        
        logger.info(`Starting SeaBot with pairing mode for phone: ${cleanPhone}`);
        
        // Temporarily set pairing mode in config
        config.whatsapp.defaultConnectionMode = 'pairing';
        config.whatsapp.pairingNumber = cleanPhone;
        config.whatsapp.printQRInTerminal = false; // Disable QR when using pairing
        
        // Connect to MongoDB
        await connectToDatabase();
        logger.info('Connected to MongoDB successfully');
        
        // Initialize WhatsApp client
        const whatsappClient = new WhatsAppClient();
        await whatsappClient.initialize();
        
        logger.info('SeaBot started successfully with pairing mode');
        
    } catch (error) {
        logger.error('Failed to start SeaBot with pairing:', error);
        process.exit(1);
    }
}

// Handle process termination gracefully
process.on('SIGINT', () => {
    logger.info('Received SIGINT, shutting down gracefully...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, shutting down gracefully...');
    process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
});

startBotWithPairing();