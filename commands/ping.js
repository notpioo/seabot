async function pingCommand(sock, message, user, args, startTime) {
    const from = message.key.remoteJid;
    
    try {
        // Send initial "calculating..." message
        const sentMessage = await sock.sendMessage(from, { 
            text: 'Calculating...' 
        });

        // Calculate response time
        const endTime = Date.now();
        const responseTime = (endTime - startTime).toFixed(3);

        // Edit the message to show pong with speed
        await sock.sendMessage(from, {
            text: `Pong! ${responseTime}ms`,
            edit: sentMessage.key
        });

    } catch (error) {
        console.error('Error in ping command:', error);
        await sock.sendMessage(from, { 
            text: 'Error calculating ping!' 
        });
    }
}

module.exports = pingCommand;
