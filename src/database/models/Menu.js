
const mongoose = require('mongoose');

const menuSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        default: 'Bot Menu'
    },
    description: {
        type: String,
        default: 'Welcome to our bot! Here are available features:'
    },
    content: {
        type: String,
        required: true,
        default: `🤖 *Bot Menu*

📋 *Available Commands:*
• .ping - Check bot status
• .menu - Show this menu

⚙️ *Bot Info:*
• Version: 1.0.0
• Status: Online

Thank you for using our bot! 🙏`
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Static method to get menu content
menuSchema.statics.getMenuContent = async function() {
    try {
        const menu = await this.findOne({ isActive: true });
        return menu ? menu.content : this.getDefaultContent();
    } catch (error) {
        console.error('Error getting menu content:', error);
        return this.getDefaultContent();
    }
};

// Static method for default content
menuSchema.statics.getDefaultContent = function() {
    return `🤖 *Bot Menu*

📋 *Available Commands:*
• .ping - Check bot status
• .menu - Show this menu

⚙️ *Bot Info:*
• Version: 1.0.0
• Status: Online

Thank you for using our bot! 🙏`;
};

// Static method to initialize default menu
menuSchema.statics.initializeMenu = async function() {
    try {
        const existingMenu = await this.findOne({});
        if (!existingMenu) {
            await this.create({
                title: 'Bot Menu',
                description: 'Welcome to our bot! Here are available features:',
                content: this.getDefaultContent()
            });
            console.log('Default menu initialized successfully');
        }
    } catch (error) {
        console.error('Error initializing menu:', error);
    }
};

module.exports = mongoose.model('Menu', menuSchema);
