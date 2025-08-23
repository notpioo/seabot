const User = require('../database/models/User');

async function linkjidCommand(sock, message, user, args) {
    const from = message.key.remoteJid;
    const sender = message.key.participant || from;
    
    try {
        // Only owner can use this command
        if (user.status !== 'owner') {
            await sock.sendMessage(from, { 
                text: '❌ Only owner can use this command!' 
            });
            return;
        }

        if (!args || args.length < 2) {
            await sock.sendMessage(from, { 
                text: `❌ Usage: .linkjid <primary_jid> <secondary_jid>

Example: .linkjid 6285709557572@s.whatsapp.net 78752604233848@s.whatsapp.net

This will link the secondary JID to the primary user account.` 
            });
            return;
        }

        const primaryJid = args[0];
        const secondaryJid = args[1];

        // Find primary user
        const primaryUser = await User.findOne({ jid: primaryJid });
        if (!primaryUser) {
            await sock.sendMessage(from, { 
                text: `❌ Primary user not found: ${primaryJid}` 
            });
            return;
        }

        // Find secondary user
        const secondaryUser = await User.findOne({ jid: secondaryJid });
        
        if (secondaryUser) {
            // If secondary user exists, merge their data and delete the duplicate
            if (secondaryUser.balance > primaryUser.balance) {
                primaryUser.balance = secondaryUser.balance;
            }
            if (secondaryUser.genesis > primaryUser.genesis) {
                primaryUser.genesis = secondaryUser.genesis;
            }
            if (secondaryUser.limitUsed > primaryUser.limitUsed) {
                primaryUser.limitUsed = secondaryUser.limitUsed;
            }
            
            // Delete the secondary user
            await User.deleteOne({ jid: secondaryJid });
        }

        // Add secondary JID to primary user's alternatives
        if (!primaryUser.alternativeJids.includes(secondaryJid)) {
            primaryUser.alternativeJids.push(secondaryJid);
            await primaryUser.save();
        }

        await sock.sendMessage(from, { 
            text: `✅ Successfully linked JID ${secondaryJid} to ${primaryUser.pushName} (${primaryJid})

Now both JIDs will use the same user data.` 
        });

    } catch (error) {
        console.error('Error in linkjid command:', error);
        await sock.sendMessage(from, { 
            text: '❌ Failed to link JIDs!' 
        });
    }
}

module.exports = linkjidCommand;