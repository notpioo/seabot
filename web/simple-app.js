const express = require('express');
const session = require('express-session');
const path = require('path');
const logger = require('../src/utils/logger');

class SimpleWebServer {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 5000;
        this.setupMiddleware();
        this.setupRoutes();
    }

    formatUptime(seconds) {
        const days = Math.floor(seconds / (24 * 3600));
        const hours = Math.floor((seconds % (24 * 3600)) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        if (days > 0) return `${days}d ${hours}h ${minutes}m`;
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m ${secs}s`;
    }

    setupMiddleware() {
        // Body parsing
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));

        // Session configuration
        this.app.use(session({
            secret: 'seabot-dashboard-secret',
            resave: false,
            saveUninitialized: false,
            cookie: { maxAge: 24 * 60 * 60 * 1000 }
        }));

        // Template engine
        this.app.set('view engine', 'ejs');
        this.app.set('views', path.join(__dirname, 'views'));

        // Layout engine (optional, some pages may not use it)
        try {
            const expressLayouts = require('express-ejs-layouts');
            this.app.use(expressLayouts);
            this.app.set('layout', 'simple-layout');
        } catch (error) {
            console.warn('Express-ejs-layouts not configured properly, pages will render without layout');
        }
    }

    setupRoutes() {
        // Login route (without layout)
        this.app.get('/auth/login', (req, res) => {
            res.render('auth/login', {
                title: 'SeaBot Dashboard - Login',
                error: null,
                layout: false  // Disable layout for login page
            });
        });

        this.app.post('/auth/login', (req, res) => {
            if (req.body.password === 'Faratama') {
                req.session.isAuthenticated = true;
                req.session.user = { loginTime: new Date() };
                return res.redirect('/dashboard');
            }
            res.redirect('/auth/login?error=1');
        });

        this.app.get('/auth/logout', (req, res) => {
            req.session.destroy();
            res.redirect('/auth/login');
        });

        // Data page
        this.app.get('/data', this.requireAuth, (req, res) => {
            res.render('simple-page', {
                title: 'Data Management - SeaBot Dashboard',
                currentPage: 'data',
                pageTitle: 'Data Management',
                pageIcon: 'fas fa-database',
                pageDescription: 'User data and statistics will be displayed here.',
                alertMessage: 'Data management features coming soon!'
            });
        });

        // Menu management page
        this.app.get('/menu', this.requireAuth, async (req, res) => {
            try {
                const Menu = require('../src/database/models/Menu');
                let menu = null;
                
                if (Menu && typeof Menu.findOne === 'function') {
                    try {
                        menu = await Menu.findOne({ where: { isActive: true } });
                    } catch (dbError) {
                        console.warn('Database query failed, using default menu:', dbError.message);
                    }
                }

                if (!menu) {
                    menu = {
                        title: 'Bot Menu',
                        description: 'Welcome to our bot! Here are available features:',
                        content: Menu && typeof Menu.getDefaultContent === 'function' ? 
                            Menu.getDefaultContent() : 
                            `🤖 *Bot Menu*\n\n📋 *Available Commands:*\n• .ping - Check bot status\n• .menu - Show this menu\n\n⚙️ *Bot Info:*\n• Version: 1.0.0\n• Status: Online\n\nThank you for using our bot! 🙏`,
                        isActive: true
                    };
                }

                res.render('dashboard/menu', {
                    title: 'Menu Management - SeaBot Dashboard',
                    currentPage: 'menu',
                    menu: menu
                });
            } catch (error) {
                console.error('Error loading menu page:', error);
                res.render('simple-page', {
                    title: 'Menu Management - SeaBot Dashboard',
                    currentPage: 'menu',
                    pageTitle: 'Menu Management',
                    pageIcon: 'fas fa-bars',
                    pageDescription: 'Configure bot menu response that appears when users type .menu command',
                    alertMessage: 'Error loading menu settings. Please try again.'
                });
            }
        });

        // Command page
        this.app.get('/command', this.requireAuth, async (req, res) => {
            try {
                // Get commands from shared config file
                const fs = require('fs');
                const path = require('path');
                const configPath = path.join(__dirname, '..', 'config', 'commands.json');

                let commands = [];
                try {
                    const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                    commands = configData.commands || [];
                } catch (error) {
                    console.warn('Could not read commands config, using defaults:', error.message);
                    commands = [
                        { id: 1, name: 'ping', description: 'Check bot response time and status', category: 'utility', isActive: true, ownerOnly: false, usageCount: 25, cooldown: 2 },
                        { id: 2, name: 'menu', description: 'Show bot menu with available commands', category: 'general', isActive: true, ownerOnly: false, usageCount: 42, cooldown: 3 }
                    ];
                }

                const stats = {
                    totalCommands: commands.length,
                    totalUsedCommands: commands.reduce((sum, cmd) => sum + cmd.usageCount, 0),
                    inactiveCommands: commands.filter(c => !c.isActive).length,
                    ownerCommands: commands.filter(c => c.ownerOnly).length
                };

                res.render('simple-page', {
                    title: 'Command Management - SeaBot Dashboard',
                    currentPage: 'command',
                    pageTitle: 'Command Management',
                    pageIcon: 'fas fa-terminal',
                    pageDescription: 'Manage WhatsApp bot commands and their settings',
                    alertMessage: null,
                    commands,
                    stats
                });
            } catch (error) {
                console.error('Error loading command page:', error);
                res.render('simple-page', {
                    title: 'Command Management - SeaBot Dashboard',
                    currentPage: 'command',
                    pageTitle: 'Command Management',
                    pageIcon: 'fas fa-terminal',
                    pageDescription: 'Manage WhatsApp bot commands and their settings',
                    alertMessage: 'Error loading command data. Please try again.'
                });
            }
        });

        // Config page
        this.app.get('/config', this.requireAuth, (req, res) => {
            res.render('simple-page', {
                title: 'Bot Configuration - SeaBot Dashboard',
                currentPage: 'config',
                pageTitle: 'Bot Configuration',
                pageIcon: 'fas fa-cog',
                pageDescription: 'Bot settings and configuration options will be displayed here.',
                alertMessage: 'Configuration features coming soon!'
            });
        });




        // Dashboard route
        this.app.get('/dashboard', this.requireAuth, async (req, res) => {
            try {
                const { Stats } = require('../src/database/models/Stats');
                const { Command } = require('../src/database/models/Command');
                const memUsage = process.memoryUsage();
                const formatBytes = (bytes) => {
                    return Math.round(bytes / 1024 / 1024 * 100) / 100 + ' MB';
                };

                // Get real data with fallbacks
                let totalUsedCommands = 67;  // Fallback data
                let totalCommands = 4;       // Current active commands
                let totalUsers = 0;          // Will get from database

                try {
                    // Try to get real user count from database
                    const { User } = require('../src/database/models/User');
                    if (User && typeof User.count === 'function') {
                        totalUsers = await User.count() || 0;
                    }

                    if (Stats && typeof Stats.getCommandCount === 'function') {
                        totalUsedCommands = await Stats.getCommandCount() || 67;
                    }

                    if (Command && typeof Command.getTotalActiveCommands === 'function') {
                        totalCommands = await Command.getTotalActiveCommands() || 4;
                    }
                } catch (error) {
                    console.error('Error getting stats, using fallback data:', error);
                    // Keep fallback values
                    totalUsers = 0;  // If no users in DB, show 0
                }

                const stats = {
                    totalUsers: totalUsers,
                    totalCommands: totalCommands,
                    totalUsedCommands: totalUsedCommands,
                    uptimeFormatted: this.formatUptime(process.uptime()),
                    nodeVersion: process.version,
                    memoryFormatted: {
                        rss: formatBytes(memUsage.rss),
                        heapUsed: formatBytes(memUsage.heapUsed),
                        heapTotal: formatBytes(memUsage.heapTotal),
                        external: formatBytes(memUsage.external)
                    }
                };

                res.render('simple-dashboard', {
                    title: 'SeaBot Dashboard',
                    currentPage: 'dashboard',
                    stats,
                    user: req.session.user
                });
            } catch (error) {
                console.error('Error loading dashboard:', error);
                res.status(500).send('Internal Server Error');
            }
        });

        // API Routes for Command Management

        // Get single command
        this.app.get('/api/commands/:id', this.requireAuth, async (req, res) => {
            try {
                // Get commands from shared config file
                const fs = require('fs');
                const path = require('path');
                const configPath = path.join(__dirname, '..', 'config', 'commands.json');

                let commands = [];
                try {
                    const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                    commands = configData.commands || [];
                } catch (error) {
                    commands = [
                        { id: 1, name: 'ping', description: 'Check bot response time and status', category: 'utility', isActive: true, ownerOnly: false, usageCount: 25, cooldown: 2 },
                        { id: 2, name: 'menu', description: 'Show bot menu with available commands', category: 'general', isActive: true, ownerOnly: false, usageCount: 42, cooldown: 3 }
                    ];
                }

                const command = commands.find(c => c.id == req.params.id);
                if (!command) {
                    return res.status(404).json({ error: 'Command not found' });
                }
                res.json(command);
            } catch (error) {
                console.error('Error getting command:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Update command
        this.app.put('/api/commands/:id', this.requireAuth, async (req, res) => {
            try {
                const { name, description, category, cooldown, ownerOnly, isActive } = req.body;

                // Validation
                if (!name || !description || !category) {
                    return res.status(400).json({ error: 'Missing required fields' });
                }

                // Get commands from shared config file
                const fs = require('fs');
                const path = require('path');
                const configPath = path.join(__dirname, '..', 'config', 'commands.json');

                let commands = [];
                try {
                    const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                    commands = configData.commands || [];
                } catch (error) {
                    commands = [
                        { id: 1, name: 'ping', description: 'Check bot response time and status', category: 'utility', isActive: true, ownerOnly: false, usageCount: 25, cooldown: 2 },
                        { id: 2, name: 'menu', description: 'Show bot menu with available commands', category: 'general', isActive: true, ownerOnly: false, usageCount: 42, cooldown: 3 }
                    ];
                }

                // Find and update the command
                const commandIndex = commands.findIndex(c => c.id == req.params.id);
                if (commandIndex !== -1) {
                    commands[commandIndex] = {
                        ...commands[commandIndex],
                        name: name.toLowerCase().trim(),
                        description,
                        category,
                        cooldown: cooldown || 3,
                        ownerOnly: ownerOnly || false,
                        isActive: isActive !== false
                    };

                    // Save to shared config file
                    try {
                        fs.writeFileSync(configPath, JSON.stringify({ commands }, null, 2));
                        console.log('Commands config updated successfully');
                    } catch (writeError) {
                        console.error('Error saving commands config:', writeError);
                        return res.status(500).json({ error: 'Failed to save command changes' });
                    }

                    console.log(`Command ${req.params.id} updated:`, req.body);

                    res.json({ 
                        success: true, 
                        message: 'Command updated successfully',
                        command: commands[commandIndex]
                    });
                } else {
                    res.status(404).json({ error: 'Command not found' });
                }
            } catch (error) {
                console.error('Error updating command:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Toggle command status
        this.app.post('/api/commands/:id/toggle', this.requireAuth, async (req, res) => {
            try {
                // Get commands from shared config file
                const fs = require('fs');
                const path = require('path');
                const configPath = path.join(__dirname, '..', 'config', 'commands.json');

                let commands = [];
                try {
                    const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                    commands = configData.commands || [];
                } catch (error) {
                    commands = [
                        { id: 1, name: 'ping', description: 'Check bot response time and status', category: 'utility', isActive: true, ownerOnly: false, usageCount: 25, cooldown: 2 },
                        { id: 2, name: 'menu', description: 'Show bot menu with available commands', category: 'general', isActive: true, ownerOnly: false, usageCount: 42, cooldown: 3 }
                    ];
                }

                // Find and toggle the command
                const commandIndex = commands.findIndex(c => c.id == req.params.id);
                if (commandIndex !== -1) {
                    commands[commandIndex].isActive = !commands[commandIndex].isActive;

                    // Save to shared config file
                    try {
                        fs.writeFileSync(configPath, JSON.stringify({ commands }, null, 2));
                        console.log(`Command ${commands[commandIndex].name} toggled to: ${commands[commandIndex].isActive}`);
                    } catch (writeError) {
                        console.error('Error saving commands config:', writeError);
                        return res.status(500).json({ error: 'Failed to toggle command status' });
                    }

                    console.log(`Command ${req.params.id} toggled to: ${commands[commandIndex].isActive}`);

                    res.json({ 
                        success: true, 
                        message: `Command ${commands[commandIndex].isActive ? 'activated' : 'deactivated'} successfully`
                    });
                } else {
                    res.status(404).json({ error: 'Command not found' });
                }
            } catch (error) {
                console.error('Error toggling command:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Initialize commands
        this.app.post('/api/commands/initialize', this.requireAuth, async (req, res) => {
            try {
                const Command = require('../src/database/models/Command');
                await Command.initializeCommands();
                res.json({ success: true, message: 'Commands initialized successfully' });
            } catch (error) {
                console.error('Error initializing commands:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // API Routes for Menu Management

        // Get all menu items
        this.app.get('/api/menu', this.requireAuth, async (req, res) => {
            try {
                const Menu = require('../src/database/models/Menu'); // Assuming you have a Menu model
                const menus = await Menu.find({});
                res.json(menus);
            } catch (error) {
                console.error('Error getting menu items:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Get single menu item
        this.app.get('/api/menu/:id', this.requireAuth, async (req, res) => {
            try {
                const Menu = require('../src/database/models/Menu');

                // Handle special case for 'current'
                if (req.params.id === 'current') {
                    let menu = null;
                    
                    if (Menu && typeof Menu.findOne === 'function') {
                        try {
                            menu = await Menu.findOne({ where: { isActive: true } });
                        } catch (dbError) {
                            console.warn('Database query failed:', dbError.message);
                        }
                    }

                    if (!menu) {
                        return res.json({
                            success: true,
                            data: {
                                title: 'Bot Menu',
                                description: 'Welcome to our bot! Here are available features:',
                                content: Menu && typeof Menu.getDefaultContent === 'function' ? 
                                    Menu.getDefaultContent() : 
                                    `🤖 *Bot Menu*\n\n📋 *Available Commands:*\n• .ping - Check bot status\n• .menu - Show this menu\n\n⚙️ *Bot Info:*\n• Version: 1.0.0\n• Status: Online\n\nThank you for using our bot! 🙏`,
                                isActive: true
                            }
                        });
                    }

                    return res.json({
                        success: true,
                        data: menu
                    });
                }

                // Handle other IDs
                if (Menu && typeof Menu.findOne === 'function') {
                    const menu = await Menu.findOne({ where: { id: req.params.id } });
                    if (!menu) {
                        return res.status(404).json({ error: 'Menu item not found' });
                    }
                    res.json(menu);
                } else {
                    res.status(404).json({ error: 'Menu item not found' });
                }
            } catch (error) {
                console.error('Error getting menu item:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Create new menu item
        this.app.post('/api/menu', this.requireAuth, async (req, res) => {
            try {
                const Menu = require('../src/database/models/Menu');
                const { title, description, content } = req.body;

                if (!content || content.trim() === '') {
                    return res.status(400).json({
                        success: false,
                        error: 'Menu content is required'
                    });
                }

                let menu = null;

                if (Menu && typeof Menu.findOne === 'function') {
                    try {
                        // Find existing menu or create new one
                        menu = await Menu.findOne({ where: { isActive: true } });

                        if (menu) {
                            // Update existing menu
                            menu.title = title || menu.title;
                            menu.description = description || menu.description;
                            menu.content = content;
                            menu.updatedAt = new Date();
                            await menu.save();
                        } else {
                            // Create new menu
                            menu = await Menu.create({
                                title: title || 'Bot Menu',
                                description: description || 'Welcome to our bot! Here are available features:',
                                content: content,
                                isActive: true
                            });
                        }
                    } catch (dbError) {
                        console.warn('Database operation failed:', dbError.message);
                        // Return success with fallback data
                        return res.json({
                            success: true,
                            message: 'Menu saved (fallback mode)',
                            data: {
                                title: title || 'Bot Menu',
                                description: description || 'Welcome to our bot! Here are available features:',
                                content: content,
                                isActive: true
                            }
                        });
                    }
                }

                res.json({
                    success: true,
                    message: 'Menu updated successfully',
                    data: menu || {
                        title: title || 'Bot Menu',
                        description: description || 'Welcome to our bot! Here are available features:',
                        content: content,
                        isActive: true
                    }
                });
            } catch (error) {
                console.error('Error creating/updating menu item:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Get current menu for editing
        this.app.get('/api/menu/current', this.requireAuth, async (req, res) => {
            try {
                const Menu = require('../src/database/models/Menu');
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
                console.error('Error getting current menu:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Reset menu to default
        this.app.post('/api/menu/reset', this.requireAuth, async (req, res) => {
            try {
                const Menu = require('../src/database/models/Menu');
                const defaultContent = Menu && typeof Menu.getDefaultContent === 'function' ? 
                    Menu.getDefaultContent() : 
                    `🤖 *Bot Menu*\n\n📋 *Available Commands:*\n• .ping - Check bot status\n• .menu - Show this menu\n\n⚙️ *Bot Info:*\n• Version: 1.0.0\n• Status: Online\n\nThank you for using our bot! 🙏`;

                let menu = null;

                if (Menu && typeof Menu.findOne === 'function') {
                    try {
                        menu = await Menu.findOne({ where: { isActive: true } });

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
                    } catch (dbError) {
                        console.warn('Database operation failed, using fallback:', dbError.message);
                        menu = {
                            title: 'Bot Menu',
                            description: 'Welcome to our bot! Here are available features:',
                            content: defaultContent,
                            isActive: true
                        };
                    }
                }

                res.json({
                    success: true,
                    message: 'Menu reset to default successfully',
                    data: menu || {
                        title: 'Bot Menu',
                        description: 'Welcome to our bot! Here are available features:',
                        content: defaultContent,
                        isActive: true
                    }
                });
            } catch (error) {
                console.error('Error resetting menu:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Update menu item
        this.app.put('/api/menu/:id', this.requireAuth, async (req, res) => {
            try {
                const Menu = require('../src/database/models/Menu');
                await Menu.findByIdAndUpdate(req.params.id, req.body, { new: true });
                res.json({ success: true, message: 'Menu item updated successfully' });
            } catch (error) {
                console.error('Error updating menu item:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Delete menu item
        this.app.delete('/api/menu/:id', this.requireAuth, async (req, res) => {
            try {
                const Menu = require('../src/database/models/Menu');
                await Menu.findByIdAndDelete(req.params.id);
                res.json({ success: true, message: 'Menu item deleted successfully' });
            } catch (error) {
                console.error('Error deleting menu item:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Root redirect
        this.app.get('/', (req, res) => {
            if (req.session.isAuthenticated) {
                res.redirect('/dashboard');
            } else {
                res.redirect('/auth/login');
            }
        });
    }

    requireAuth = (req, res, next) => {
        if (!req.session.isAuthenticated) {
            return res.redirect('/auth/login');
        }
        next();
    };

    start() {
        try {
            this.server = this.app.listen(this.port, '0.0.0.0', () => {
                logger.info(`Simple Web dashboard running on http://0.0.0.0:${this.port}`);
                console.log(`\n🌐 Simple Web Dashboard: http://0.0.0.0:${this.port}`);
                console.log(`📊 Login with password: Faratama\n`);
            });

            this.server.on('error', (error) => {
                logger.error('Simple web server error:', error);
            });

        } catch (error) {
            logger.error('Failed to start simple web server:', error);
            throw error;
        }
    }

    stop() {
        if (this.server) {
            this.server.close(() => {
                logger.info('Simple web server stopped');
            });
        }
    }
}

module.exports = SimpleWebServer;