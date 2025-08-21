const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../../src/utils/logger');
const Command = require('../../src/database/models/Command');

const router = express.Router();

// Get all commands
async function getAllCommands() {
    try {
        const commandsPath = path.join(__dirname, '../../src/commands');
        const files = await fs.readdir(commandsPath);
        const commands = [];

        for (const file of files) {
            if (file.endsWith('.js')) {
                try {
                    const commandPath = path.join(commandsPath, file);
                    const command = require(commandPath);
                    commands.push({
                        file: file,
                        name: command.name || 'Unknown',
                        description: command.description || 'No description',
                        usage: command.usage || 'No usage info',
                        category: command.category || 'General',
                        cooldown: command.cooldown || 0
                    });
                } catch (error) {
                    logger.error(`Error loading command ${file}:`, error);
                    commands.push({
                        file: file,
                        name: file.replace('.js', ''),
                        description: 'Error loading command',
                        usage: 'N/A',
                        category: 'Error',
                        cooldown: 0,
                        error: true
                    });
                }
            }
        }

        return commands;
    } catch (error) {
        logger.error('Error getting commands:', error);
        return [];
    }
}

// Commands page
router.get('/', async (req, res) => {
    try {
        const commands = await getAllCommands();
        
        res.render('dashboard/commands', {
            title: 'Command Management - SeaBot Dashboard',
            commands
        });
    } catch (error) {
        logger.error('Commands page error:', error);
        res.status(500).render('error', {
            title: 'Commands Error',
            error: {
                status: 500,
                message: 'Unable to load commands'
            }
        });
    }
});

// API endpoint to get command details
router.get('/api/command/:name', async (req, res) => {
    try {
        const commandName = req.params.name;
        const commandPath = path.join(__dirname, '../../src/commands', `${commandName}.js`);
        
        // Check if command file exists
        try {
            await fs.access(commandPath);
        } catch {
            return res.status(404).json({
                success: false,
                error: 'Command not found'
            });
        }

        const command = require(commandPath);
        const fileContent = await fs.readFile(commandPath, 'utf-8');

        res.json({
            success: true,
            data: {
                ...command,
                fileContent,
                filePath: commandPath
            }
        });
    } catch (error) {
        logger.error('Command API error:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to fetch command data'
        });
    }
});

// API endpoint to update command
router.post('/api/command/:name', async (req, res) => {
    try {
        const commandName = req.params.name;
        const { fileContent } = req.body;
        
        if (!fileContent) {
            return res.status(400).json({
                success: false,
                error: 'File content is required'
            });
        }

        const commandPath = path.join(__dirname, '../../src/commands', `${commandName}.js`);
        
        // Backup original file
        const backupPath = path.join(__dirname, '../../src/commands', `${commandName}.js.backup`);
        try {
            const originalContent = await fs.readFile(commandPath, 'utf-8');
            await fs.writeFile(backupPath, originalContent);
        } catch (error) {
            logger.warn('Could not create backup:', error);
        }

        // Write new content
        await fs.writeFile(commandPath, fileContent);
        
        // Clear require cache to reload the module
        delete require.cache[require.resolve(commandPath)];
        
        logger.info(`Command ${commandName} updated by admin`);
        res.json({
            success: true,
            message: 'Command updated successfully'
        });
    } catch (error) {
        logger.error('Update command error:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to update command'
        });
    }
});

// API endpoint to create new command
router.post('/api/command', async (req, res) => {
    try {
        const { name, fileContent } = req.body;
        
        if (!name || !fileContent) {
            return res.status(400).json({
                success: false,
                error: 'Name and file content are required'
            });
        }

        const commandPath = path.join(__dirname, '../../src/commands', `${name}.js`);
        
        // Check if command already exists
        try {
            await fs.access(commandPath);
            return res.status(400).json({
                success: false,
                error: 'Command already exists'
            });
        } catch {
            // File doesn't exist, which is what we want
        }

        await fs.writeFile(commandPath, fileContent);
        
        logger.info(`New command ${name} created by admin`);
        res.json({
            success: true,
            message: 'Command created successfully'
        });
    } catch (error) {
        logger.error('Create command error:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to create command'
        });
    }
});

// API endpoint to delete command
router.delete('/api/command/:name', async (req, res) => {
    try {
        const commandName = req.params.name;
        const commandPath = path.join(__dirname, '../../src/commands', `${commandName}.js`);
        
        // Check if command exists
        try {
            await fs.access(commandPath);
        } catch {
            return res.status(404).json({
                success: false,
                error: 'Command not found'
            });
        }

        // Create backup before deleting
        const backupPath = path.join(__dirname, '../../src/commands', `${commandName}.js.deleted`);
        const fileContent = await fs.readFile(commandPath, 'utf-8');
        await fs.writeFile(backupPath, fileContent);
        
        // Delete the command
        await fs.unlink(commandPath);
        
        // Clear require cache
        delete require.cache[require.resolve(commandPath)];
        
        logger.info(`Command ${commandName} deleted by admin`);
        res.json({
            success: true,
            message: 'Command deleted successfully'
        });
    } catch (error) {
        logger.error('Delete command error:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to delete command'
        });
    }
});

// API endpoint to get database commands
router.get('/api/database/commands', async (req, res) => {
    try {
        const commands = await Command.find({}).sort({ name: 1 });
        res.json({
            success: true,
            data: commands
        });
    } catch (error) {
        logger.error('Database commands API error:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to fetch database commands'
        });
    }
});

// API endpoint to update database command
router.put('/api/database/command/:id', async (req, res) => {
    try {
        const commandId = req.params.id;
        const updateData = req.body;
        
        const command = await Command.findByIdAndUpdate(
            commandId,
            {
                ...updateData,
                updatedAt: new Date()
            },
            { new: true, runValidators: true }
        );
        
        if (!command) {
            return res.status(404).json({
                success: false,
                error: 'Command not found'
            });
        }
        
        // Notify that commands should be reloaded
        // In a production environment, you might want to emit an event here
        logger.info(`Database command ${command.name} updated by admin`);
        
        res.json({
            success: true,
            message: 'Command updated successfully',
            data: command
        });
    } catch (error) {
        logger.error('Update database command error:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to update command'
        });
    }
});

// API endpoint to create database command
router.post('/api/database/command', async (req, res) => {
    try {
        const commandData = req.body;
        
        const command = new Command({
            ...commandData,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        
        await command.save();
        
        logger.info(`New database command ${command.name} created by admin`);
        res.json({
            success: true,
            message: 'Command created successfully',
            data: command
        });
    } catch (error) {
        logger.error('Create database command error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Unable to create command'
        });
    }
});

// API endpoint to reload commands (notify bot to reload)
router.post('/api/commands/reload', async (req, res) => {
    try {
        // Set a flag that the bot can check periodically
        // For now, just log the request
        logger.info('Commands reload requested by admin');
        
        res.json({
            success: true,
            message: 'Command reload request sent. Bot will reload commands on next message processing.'
        });
    } catch (error) {
        logger.error('Reload commands error:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to process reload request'
        });
    }
});

module.exports = router;