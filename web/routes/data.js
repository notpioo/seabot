const express = require('express');
const User = require('../../src/database/models/User');
const logger = require('../../src/utils/logger');

const router = express.Router();

// Data page - show users and statistics
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        // Get users with pagination
        const users = await User.find({})
            .sort({ lastSeen: -1 })
            .skip(skip)
            .limit(limit);

        const totalUsers = await User.countDocuments();
        const totalPages = Math.ceil(totalUsers / limit);

        res.render('dashboard/data', {
            title: 'Data Management - SeaBot Dashboard',
            users,
            pagination: {
                currentPage: page,
                totalPages,
                totalUsers,
                hasNext: page < totalPages,
                hasPrev: page > 1,
                limit
            }
        });
    } catch (error) {
        logger.error('Data page error:', error);
        res.status(500).render('error', {
            title: 'Data Error',
            error: {
                status: 500,
                message: 'Unable to load user data'
            }
        });
    }
});

// API endpoint to get user details  
router.get('/api/user/:jid', async (req, res) => {
    try {
        const user = await User.findOne({ jid: req.params.jid });
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        logger.error('User API error:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to fetch user data'
        });
    }
});

// API endpoint to update user
router.post('/api/user/:jid', async (req, res) => {
    try {
        const { name, isBanned, isOwner } = req.body;
        
        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (isBanned !== undefined) updateData.isBanned = isBanned;
        if (isOwner !== undefined) updateData.isOwner = isOwner;

        const user = await User.findOneAndUpdate(
            { jid: req.params.jid },
            { $set: updateData },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        logger.info(`User ${req.params.jid} updated by admin`);
        res.json({
            success: true,
            data: user,
            message: 'User updated successfully'
        });
    } catch (error) {
        logger.error('Update user error:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to update user'
        });
    }
});

// API endpoint to delete user
router.delete('/api/user/:jid', async (req, res) => {
    try {
        const user = await User.findOneAndDelete({ jid: req.params.jid });
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        logger.info(`User ${req.params.jid} deleted by admin`);
        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        logger.error('Delete user error:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to delete user'
        });
    }
});

// Export users data
router.get('/export', async (req, res) => {
    try {
        const users = await User.find({}).select('-_id -__v');
        
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=seabot-users.json');
        res.json(users);
    } catch (error) {
        logger.error('Export error:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to export data'
        });
    }
});

module.exports = router;