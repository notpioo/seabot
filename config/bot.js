require('dotenv').config();

module.exports = {
    botName: process.env.BOT_NAME || 'SeaBot',
    ownerNumber: process.env.OWNER_NUMBER || '6285709557572',
    
    // Owner configuration with LID support
    owners: [
        '6285709557572', // Phone number format
        // Add LID here when obtained from .getlid command
    ],
    prefixes: ['.', '!', '#', '/'],
    
    // User settings
    defaultBalance: 50,
    defaultGenesis: 100,
    maxLimit: 30,
    
    // Status types
    statusTypes: {
        OWNER: 'owner',
        PREMIUM: 'premium',
        BASIC: 'basic'
    },
    
    // MongoDB connection
    mongodbUri: process.env.MONGODB_URI,
    
    // Rate limiting
    commandCooldown: 2000, // 2 seconds between commands
    
    // API Keys
    betabotzApiKey: 'babychand',
    botcahxApiKey: 'babychand',
};
