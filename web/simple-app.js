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
        
        // Layout engine
        const expressLayouts = require('express-ejs-layouts');
        this.app.use(expressLayouts);
        this.app.set('layout', 'simple-layout');
    }

    setupRoutes() {
        // Login route
        this.app.get('/auth/login', (req, res) => {
            res.render('auth/login', {
                title: 'SeaBot Dashboard - Login',
                error: null
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
                let menu = await Menu.findOne({ isActive: true });
                
                if (!menu) {
                    menu = {
                        title: 'Bot Menu',
                        description: 'Welcome to our bot! Here are available features:',
                        content: Menu.getDefaultContent(),
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
                const Command = require('../src/database/models/Command');
                const Stats = require('../src/database/models/Stats');

                const commands = await Command.find({}).sort({ name: 1 });
                const totalCommands = await Command.getTotalActiveCommands();
                const totalUsedCommands = await Stats.getCommandCount();
                const inactiveCommands = await Command.countDocuments({ isActive: false });
                const ownerCommands = await Command.countDocuments({ ownerOnly: true });

                const stats = {
                    totalCommands,
                    totalUsedCommands,
                    inactiveCommands,
                    ownerCommands
                };

                res.render('command-management', {
                    title: 'Command Management - SeaBot Dashboard',
                    currentPage: 'command',
                    commands,
                    stats
                });
            } catch (error) {
                console.error('Error loading command page:', error);
                res.status(500).send('Internal Server Error');
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
                const Stats = require('../src/database/models/Stats');
                const memUsage = process.memoryUsage();
                const formatBytes = (bytes) => {
                    return Math.round(bytes / 1024 / 1024 * 100) / 100 + ' MB';
                };

                // Get real data from database
                const totalUsedCommands = await Stats.getCommandCount();
                const Command = require('../src/database/models/Command');
                const totalCommands = await Command.getTotalActiveCommands();

                const stats = {
                    totalUsers: 0,
                    totalCommands: totalCommands,
                    totalUsedCommands: totalUsedCommands,
                    uptimeFormatted: Math.floor(process.uptime() / 60) + 'm',
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
                const Command = require('../src/database/models/Command');
                const command = await Command.findById(req.params.id);
                if (!command) {
                    return res.status(404).json({ error: 'Command not found' });
                }
                res.json(command);
            } catch (error) {
                console.error('Error getting command:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Toggle command status
        this.app.post('/api/commands/:id/toggle', this.requireAuth, async (req, res) => {
            try {
                const Command = require('../src/database/models/Command');
                const { isActive } = req.body;

                await Command.findByIdAndUpdate(req.params.id, { 
                    isActive,
                    updatedAt: new Date()
                });

                res.json({ success: true, message: 'Command status updated' });
            } catch (error) {
                console.error('Error toggling command:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Update command
        this.app.put('/api/commands/:id', this.requireAuth, async (req, res) => {
            try {
                const Command = require('../src/database/models/Command');
                const { description, category, cooldown, ownerOnly } = req.body;
                const updateData = {
                    description,
                    category,
                    cooldown,
                    ownerOnly,
                    updatedAt: new Date()
                };

                await Command.findByIdAndUpdate(req.params.id, updateData);
                res.json({ success: true, message: 'Command updated successfully' });
            } catch (error) {
                console.error('Error updating command:', error);
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

                    return res.json({
                        success: true,
                        data: menu
                    });
                }
                
                const menu = await Menu.findById(req.params.id);
                if (!menu) {
                    return res.status(404).json({ error: 'Menu item not found' });
                }
                res.json(menu);
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

                // Find existing menu or create new one
                let menu = await Menu.findOne({ isActive: true });
                
                if (menu) {
                    // Update existing menu
                    menu.title = title || menu.title;
                    menu.description = description || menu.description;
                    menu.content = content;
                    menu.updatedAt = new Date();
                    await menu.save();
                } else {
                    // Create new menu
                    menu = new Menu({
                        title: title || 'Bot Menu',
                        description: description || 'Welcome to our bot! Here are available features:',
                        content: content,
                        isActive: true
                    });
                    await menu.save();
                }
                
                res.json({
                    success: true,
                    message: 'Menu updated successfully',
                    data: menu
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
                let menu = await Menu.findOne({ isActive: true });
                
                if (menu) {
                    menu.title = 'Bot Menu';
                    menu.description = 'Welcome to our bot! Here are available features:';
                    menu.content = Menu.getDefaultContent();
                    menu.updatedAt = new Date();
                    await menu.save();
                } else {
                    menu = new Menu({
                        title: 'Bot Menu',
                        description: 'Welcome to our bot! Here are available features:',
                        content: Menu.getDefaultContent(),
                        isActive: true
                    });
                    await menu.save();
                }
                
                res.json({
                    success: true,
                    message: 'Menu reset to default successfully',
                    data: menu
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