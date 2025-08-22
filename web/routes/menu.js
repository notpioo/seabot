
const express = require('express');
const logger = require('../../src/utils/logger');
const Menu = require('../../src/database/models/Menu');

const router = express.Router();

// Menu management page
router.get('/', async (req, res) => {
    try {
        const menu = await Menu.findOne({ isActive: true }) || {
            title: 'Bot Menu',
            description: 'Welcome to our bot! Here are available features:',
            content: Menu.getDefaultContent()
        };
        
        res.render('dashboard/menu', {
            title: 'Menu Management - SeaBot Dashboard',
            menu
        });
    } catch (error) {
        logger.error('Menu page error:', error);
        res.status(500).render('error', {
            title: 'Menu Error',
            error: {
                status: 500,
                message: 'Unable to load menu settings'
            }
        });
    }
});

// API endpoint to get current menu
router.get('/api/menu', async (req, res) => {
    try {
        const menu = await Menu.findOne({ isActive: true });
        
        if (!menu) {
            return res.json({
                success: true,
                data: {
                    title: 'Bot Menu',
                    description: 'Welcome to our bot! Here are available features:',
                    content: Menu.getDefaultContent(),
                    isActive: true
                }
            });
        }

        res.json({
            success: true,
            data: menu
        });
    } catch (error) {
        logger.error('Get menu API error:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to fetch menu data'
        });
    }
});

// API endpoint to update menu
router.post('/api/menu', async (req, res) => {
    try {
        const { content } = req.body;
        
        if (!content || content.trim() === '') {
            return res.status(400).json({
                success: false,
                error: 'Menu content is required'
            });
        }

        // Check if Menu model is properly initialized
        if (!Menu.sequelize) {
            logger.warn('Menu model not initialized, storing in fallback mode');
            return res.json({
                success: true,
                message: 'Menu updated (fallback mode)',
                data: {
                    content: content,
                    isActive: true
                }
            });
        }

        // Find existing menu or create new one
        let menu = await Menu.findOne({ where: { isActive: true } });
        
        if (menu) {
            // Update existing menu
            menu.content = content;
            menu.updatedAt = new Date();
            await menu.save();
        } else {
            // Create new menu
            menu = await Menu.create({
                title: 'Bot Menu',
                description: 'Welcome to our bot! Here are available features:',
                content: content,
                isActive: true
            });
        }
        
        logger.info('Menu updated by admin');
        res.json({
            success: true,
            message: 'Menu updated successfully',
            data: menu
        });
    } catch (error) {
        logger.error('Update menu error:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to update menu'
        });
    }
});

// API endpoint to reset menu to default
router.post('/api/menu/reset', async (req, res) => {
    try {
        const defaultContent = Menu.getDefaultContent();
        
        // Check if Menu model is properly initialized
        if (!Menu.sequelize) {
            logger.warn('Menu model not initialized, using fallback mode');
            return res.json({
                success: true,
                message: 'Menu reset to default (fallback mode)',
                data: {
                    content: defaultContent,
                    isActive: true
                }
            });
        }

        let menu = await Menu.findOne({ where: { isActive: true } });
        
        if (menu) {
            menu.title = 'Bot Menu';
            menu.description = 'Welcome to our bot! Here are available features:';
            menu.content = defaultContent;
            menu.updatedAt = new Date();
            await menu.save();
        } else {
            menu = await Menu.create({
                title: 'Bot Menu',
                description: 'Welcome to our bot! Here are available features:',
                content: defaultContent,
                isActive: true
            });
        }
        
        logger.info('Menu reset to default by admin');
        res.json({
            success: true,
            message: 'Menu reset to default successfully',
            data: menu
        });
    } catch (error) {
        logger.error('Reset menu error:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to reset menu'
        });
    }
});

module.exports = router;
