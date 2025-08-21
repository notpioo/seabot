const express = require('express');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const logger = require('../../src/utils/logger');

const router = express.Router();

// Rate limiting for login attempts
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 login attempts per windowMs
    message: 'Too many login attempts, please try again later.',
    skipSuccessfulRequests: true
});

// Login page
router.get('/login', (req, res) => {
    if (req.session.isAuthenticated) {
        return res.redirect('/dashboard');
    }
    
    res.render('auth/login', {
        title: 'SeaBot Dashboard - Login',
        error: req.query.error
    });
});

// Login handler
router.post('/login', loginLimiter, async (req, res) => {
    try {
        const { password } = req.body;
        
        if (!password) {
            return res.redirect('/auth/login?error=Password is required');
        }

        // Check password (hardcoded for now, could be moved to config later)
        const correctPassword = 'Faratama';
        
        if (password === correctPassword) {
            req.session.isAuthenticated = true;
            req.session.loginTime = new Date();
            
            logger.info('Successful login from IP:', req.ip);
            
            res.redirect('/dashboard');
        } else {
            logger.warn('Failed login attempt from IP:', req.ip);
            res.redirect('/auth/login?error=Invalid password');
        }
        
    } catch (error) {
        logger.error('Login error:', error);
        res.redirect('/auth/login?error=An error occurred');
    }
});

// Logout handler
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            logger.error('Logout error:', err);
            return res.redirect('/dashboard');
        }
        
        res.redirect('/auth/login');
    });
});

// Logout GET route for convenience
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            logger.error('Logout error:', err);
            return res.redirect('/dashboard');
        }
        
        res.redirect('/auth/login');
    });
});

module.exports = router;