const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const path = require('path');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');

const config = require('../config/config');
const logger = require('../src/utils/logger');
const dashboardRoutes = require('./routes/dashboard');
const dataRoutes = require('./routes/data');
const commandRoutes = require('./routes/command');
const configRoutes = require('./routes/config');
const authRoutes = require('./routes/auth');

class WebServer {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 5000;
        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
    }

    setupMiddleware() {
        // Security middleware
        this.app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
                    scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
                    imgSrc: ["'self'", "data:", "https:"],
                }
            }
        }));

        // CORS
        this.app.use(cors({
            origin: process.env.NODE_ENV === 'production' ? false : true,
            credentials: true
        }));

        // Rate limiting
        const limiter = rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100, // limit each IP to 100 requests per windowMs
            message: 'Too many requests from this IP, please try again later.'
        });
        this.app.use(limiter);

        // Body parsing
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        // Session configuration
        this.app.use(session({
            secret: process.env.SESSION_SECRET || 'seabot-dashboard-secret-key-2024',
            resave: false,
            saveUninitialized: false,
            cookie: {
                secure: process.env.NODE_ENV === 'production',
                httpOnly: true,
                maxAge: 24 * 60 * 60 * 1000 // 24 hours
            }
        }));

        // Template engine
        this.app.set('view engine', 'ejs');
        this.app.set('views', path.join(__dirname, 'views'));

        // Static files
        this.app.use('/static', express.static(path.join(__dirname, 'public')));

        // Log requests
        this.app.use((req, res, next) => {
            logger.info(`${req.method} ${req.path} - ${req.ip}`);
            next();
        });
    }

    setupRoutes() {
        // Auth routes
        this.app.use('/auth', authRoutes);

        // Authentication middleware for protected routes
        const requireAuth = (req, res, next) => {
            if (!req.session.isAuthenticated) {
                return res.redirect('/auth/login');
            }
            next();
        };

        // Protected routes
        this.app.use('/dashboard', requireAuth, dashboardRoutes);
        this.app.use('/data', requireAuth, dataRoutes);
        this.app.use('/command', requireAuth, commandRoutes);
        this.app.use('/config', requireAuth, configRoutes);

        // Root redirect
        this.app.get('/', (req, res) => {
            if (req.session.isAuthenticated) {
                res.redirect('/dashboard');
            } else {
                res.redirect('/auth/login');
            }
        });

        // 404 handler
        this.app.use('*', (req, res) => {
            res.status(404).render('error', {
                title: '404 - Page Not Found',
                error: {
                    status: 404,
                    message: 'The page you are looking for does not exist.'
                }
            });
        });
    }

    setupErrorHandling() {
        // Error handler
        this.app.use((err, req, res, next) => {
            logger.error('Web server error:', err);
            
            const status = err.status || 500;
            const message = process.env.NODE_ENV === 'production' 
                ? 'Something went wrong!' 
                : err.message;

            res.status(status).render('error', {
                title: `${status} - Error`,
                error: {
                    status,
                    message,
                    stack: process.env.NODE_ENV === 'development' ? err.stack : null
                }
            });
        });
    }

    start() {
        try {
            this.server = this.app.listen(this.port, '0.0.0.0', () => {
                logger.info(`Web dashboard running on http://0.0.0.0:${this.port}`);
                console.log(`\n🌐 Web Dashboard: http://0.0.0.0:${this.port}`);
                console.log(`📊 Login with password: Faratama\n`);
            });

            this.server.on('error', (error) => {
                logger.error('Web server error:', error);
            });

        } catch (error) {
            logger.error('Failed to start web server:', error);
            throw error;
        }
    }

    stop() {
        if (this.server) {
            this.server.close(() => {
                logger.info('Web server stopped');
            });
        }
    }
}

module.exports = WebServer;