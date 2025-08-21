const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../../src/utils/logger');
const config = require('../../config/config');

const router = express.Router();

// Config page
router.get('/', async (req, res) => {
    try {
        res.render('dashboard/config', {
            title: 'Configuration - SeaBot Dashboard',
            config: {
                bot: config.bot,
                whatsapp: config.whatsapp,
                database: {
                    name: config.database.name,
                    // Hide sensitive connection string details
                    connected: true
                },
                logging: config.logging
            }
        });
    } catch (error) {
        logger.error('Config page error:', error);
        res.status(500).render('error', {
            title: 'Config Error',
            error: {
                status: 500,
                message: 'Unable to load configuration'
            }
        });
    }
});

// API endpoint to get current config
router.get('/api/config', (req, res) => {
    try {
        res.json({
            success: true,
            data: {
                bot: config.bot,
                whatsapp: {
                    ...config.whatsapp,
                    // Hide sensitive data
                    sessionPath: '[HIDDEN]'
                },
                database: {
                    name: config.database.name
                },
                logging: config.logging
            }
        });
    } catch (error) {
        logger.error('Config API error:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to fetch configuration'
        });
    }
});

// API endpoint to update bot config
router.post('/api/config/bot', async (req, res) => {
    try {
        const { name, version, prefixes, ownerNumber } = req.body;
        
        const configPath = path.join(__dirname, '../../config/config.js');
        const configContent = await fs.readFile(configPath, 'utf-8');
        
        let updatedConfig = configContent;
        
        if (name) {
            updatedConfig = updatedConfig.replace(
                /name:\s*['"](.*?)['"],/,
                `name: '${name}',`
            );
        }
        
        if (version) {
            updatedConfig = updatedConfig.replace(
                /version:\s*['"](.*?)['"],/,
                `version: '${version}',`
            );
        }
        
        if (prefixes && Array.isArray(prefixes)) {
            updatedConfig = updatedConfig.replace(
                /prefixes:\s*\[(.*?)\],/s,
                `prefixes: ${JSON.stringify(prefixes)},`
            );
        }
        
        if (ownerNumber) {
            updatedConfig = updatedConfig.replace(
                /ownerNumber:\s*['"](.*?)['"],/,
                `ownerNumber: '${ownerNumber}',`
            );
        }
        
        await fs.writeFile(configPath, updatedConfig);
        
        // Clear require cache to reload config
        delete require.cache[require.resolve('../../config/config')];
        
        logger.info('Bot configuration updated by admin');
        res.json({
            success: true,
            message: 'Bot configuration updated successfully'
        });
    } catch (error) {
        logger.error('Update bot config error:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to update bot configuration'
        });
    }
});

// API endpoint to update logging config
router.post('/api/config/logging', async (req, res) => {
    try {
        const { level, enableFileLog, enableConsoleLog } = req.body;
        
        const configPath = path.join(__dirname, '../../config/config.js');
        const configContent = await fs.readFile(configPath, 'utf-8');
        
        let updatedConfig = configContent;
        
        if (level) {
            updatedConfig = updatedConfig.replace(
                /level:\s*['"](.*?)['"],/,
                `level: '${level}',`
            );
        }
        
        if (enableFileLog !== undefined) {
            updatedConfig = updatedConfig.replace(
                /enableFileLog:\s*(true|false),/,
                `enableFileLog: ${enableFileLog},`
            );
        }
        
        if (enableConsoleLog !== undefined) {
            updatedConfig = updatedConfig.replace(
                /enableConsoleLog:\s*(true|false),/,
                `enableConsoleLog: ${enableConsoleLog},`
            );
        }
        
        await fs.writeFile(configPath, updatedConfig);
        
        // Clear require cache to reload config
        delete require.cache[require.resolve('../../config/config')];
        
        logger.info('Logging configuration updated by admin');
        res.json({
            success: true,
            message: 'Logging configuration updated successfully'
        });
    } catch (error) {
        logger.error('Update logging config error:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to update logging configuration'
        });
    }
});

// API endpoint to restart bot (if needed)
router.post('/api/restart', (req, res) => {
    try {
        logger.info('Bot restart requested by admin');
        
        // In a production environment, you might want to use PM2 or similar
        // For now, just log the request
        res.json({
            success: true,
            message: 'Restart request logged. Please manually restart the bot if needed.'
        });
    } catch (error) {
        logger.error('Restart request error:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to process restart request'
        });
    }
});

// API endpoint to get logs
router.get('/api/logs', async (req, res) => {
    try {
        const logsPath = path.join(__dirname, '../../logs/seabot.log');
        const lines = parseInt(req.query.lines) || 100;
        
        try {
            const logContent = await fs.readFile(logsPath, 'utf-8');
            const logLines = logContent.split('\n').slice(-lines);
            
            res.json({
                success: true,
                data: {
                    lines: logLines.filter(line => line.trim()),
                    totalLines: logLines.length
                }
            });
        } catch (error) {
            res.json({
                success: true,
                data: {
                    lines: ['Log file not found or empty'],
                    totalLines: 0
                }
            });
        }
    } catch (error) {
        logger.error('Get logs error:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to fetch logs'
        });
    }
});

module.exports = router;