require('dotenv').config();

const config = {
    // Bot Configuration
    bot: {
        name: 'SeaBot',
        version: '1.0.0',
        owner: '6285709557572@s.whatsapp.net',
        prefixes: ['.', '!', '#', '/']
    },
    
    // MongoDB Configuration
    database: {
        uri: process.env.MONGODB_URI || 'mongodb+srv://pioo:Avionika27@cluster0.feboa.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0',
        name: 'seabot',
        options: {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        }
    },
    
    // WhatsApp Configuration
    whatsapp: {
        sessionPath: './sessions',
        printQRInTerminal: true,
        browser: ['SeaBot', 'Chrome', '1.0.0'],
        qrTimeout: 60000,
        authTimeout: 60000,
        defaultConnectionMode: process.env.CONNECTION_MODE || 'qr', // 'qr' or 'pairing'
        pairingNumber: process.env.PAIRING_NUMBER || null // Phone number for pairing mode (e.g., '6285709557572')
    },
    
    // Logging Configuration
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        file: {
            enabled: true,
            filename: 'logs/seabot.log',
            maxSize: '10m',
            maxFiles: 5
        },
        console: {
            enabled: true,
            colorize: true
        }
    },
    
    // Command Configuration
    commands: {
        cooldown: 2000, // 2 seconds cooldown between commands
        maxRetries: 3,
        timeout: 30000 // 30 seconds timeout for command execution
    },
    
    // Rate Limiting
    rateLimit: {
        maxRequestsPerMinute: 20,
        maxRequestsPerHour: 100,
        banDuration: 3600000 // 1 hour ban for rate limit violations
    }
};

module.exports = config;
