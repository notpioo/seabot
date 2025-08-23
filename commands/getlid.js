async function getlidCommand(sock, message, user, args) {
    const from = message.key.remoteJid;
    const sender = message.key.participant || from;
    
    try {
        // Get the LID (Liddy ID) from the sender
        const senderJid = sender.split('@')[0];
        const lid = message.key.participant ? message.key.participant.split('@')[0] : message.key.remoteJid.split('@')[0];
        
        // Format the response
        const lidInfo = `🔍 *LID Information*

📱 *Your JID:* ${sender}
🆔 *Your LID:* ${lid}
📧 *Chat Type:* ${message.key.participant ? 'Group Chat' : 'Private Chat'}

*Note:* Copy hanya angka LID-nya saja untuk ditambahkan ke config owner jika diperlukan.`;

        await sock.sendMessage(from, { 
            text: lidInfo,
            mentions: [sender]
        });

    } catch (error) {
        console.error('Error in getlid command:', error);
        await sock.sendMessage(from, { 
            text: '❌ Failed to get LID information!' 
        });
    }
}

module.exports = getlidCommand;