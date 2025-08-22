
const { DataTypes, Model } = require('sequelize');

class Menu extends Model {
    // Static method to get menu content
    static async getMenuContent() {
        try {
            // Check if model is properly initialized
            if (!this.sequelize) {
                console.warn('Menu model not initialized, using default content');
                return this.getDefaultContent();
            }
            
            const menu = await this.findOne({ where: { isActive: true } });
            return menu ? menu.content : this.getDefaultContent();
        } catch (error) {
            console.error('Error getting menu content:', error);
            return this.getDefaultContent();
        }
    }

    // Static method for default content
    static getDefaultContent() {
        return `🤖 *Bot Menu*

📋 *Available Commands:*
• .ping - Check bot status
• .menu - Show this menu

⚙️ *Bot Info:*
• Version: 1.0.0
• Status: Online

Thank you for using our bot! 🙏`;
    }

    // Static method to initialize default menu
    static async initializeMenu() {
        try {
            if (!this.sequelize) {
                console.warn('Menu model not initialized, skipping menu initialization');
                return;
            }
            
            const existingMenu = await this.findOne();
            if (!existingMenu) {
                await this.create({
                    title: 'Bot Menu',
                    description: 'Welcome to our bot! Here are available features:',
                    content: this.getDefaultContent(),
                    isActive: true
                });
                console.log('Default menu initialized successfully');
            }
        } catch (error) {
            console.error('Error initializing menu:', error);
        }
    }
}

// Initialize the model when database connection is established
const initializeMenuModel = (sequelize) => {
    if (sequelize && !Menu.sequelize) {
        Menu.init({
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            title: {
                type: DataTypes.STRING,
                allowNull: false,
                defaultValue: 'Bot Menu'
            },
            description: {
                type: DataTypes.TEXT,
                defaultValue: 'Welcome to our bot! Here are available features:'
            },
            content: {
                type: DataTypes.TEXT,
                allowNull: false,
                defaultValue: Menu.getDefaultContent()
            },
            isActive: {
                type: DataTypes.BOOLEAN,
                defaultValue: true
            }
        }, {
            sequelize,
            modelName: 'Menu',
            tableName: 'menus',
            timestamps: true
        });
        
        console.log('Menu model initialized successfully');
    }
    return Menu;
};

// Try to initialize immediately if connection is available
try {
    const connection = require('../connection');
    if (connection && connection.getSequelize) {
        const sequelize = connection.getSequelize();
        if (sequelize) {
            initializeMenuModel(sequelize);
        }
    }
} catch (error) {
    console.warn('Menu model will be initialized when database connection is established');
}

// Export both the model and initializer
Menu.initializeMenuModel = initializeMenuModel;
module.exports = Menu;
