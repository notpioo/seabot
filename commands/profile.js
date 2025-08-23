const moment = require('moment');
const config = require('../config/bot');

async function profileCommand(sock, message, user, args) {
    const from = message.key.remoteJid;
    
    try {
        const memberSince = moment(user.memberSince).format('DD/MM/YYYY');
        const mention = message.key.participant || from;
        
        // Calculate current limit display
        let limitDisplay;
        if (user.status === config.statusTypes.OWNER || user.status === config.statusTypes.PREMIUM) {
            limitDisplay = '∞/∞';
        } else {
            const remainingLimit = user.limit - user.limitUsed;
            limitDisplay = `${remainingLimit}/${config.maxLimit}`;
        }

        const profileText = `┌─「 User Info 」
│ • Username: ${user.pushName}
│ • Tag: @${mention.split('@')[0]}
│ • Status: ${user.status}
│ • Limit: ${limitDisplay}
│ • Balance: ${user.balance}
│ • Genesis: ${user.genesis}
│ • Member since: ${memberSince}
└──────────────────────`;

        await sock.sendMessage(from, {
            text: profileText,
            mentions: [mention]
        });

    } catch (error) {
        console.error('Error in profile command:', error);
        await sock.sendMessage(from, { 
            text: '❌ Error retrieving profile information!' 
        });
    }
}

module.exports = profileCommand;
