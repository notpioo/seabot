const express = require('express');
const User = require('../../src/database/models/User');
const logger = require('../../src/utils/logger');

const router = express.Router();

// Get bot statistics
async function getBotStats() {
    try {
        const totalUsers = await User.countDocuments();
        const totalCommands = await User.aggregate([
            { $group: { _id: null, total: { $sum: "$messageCount" } } }
        ]);
        
        const activeUsers = await User.countDocuments({
            lastSeen: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
        });

        return {
            totalUsers,
            totalCommands: totalCommands[0]?.total || 0,
            activeUsers,
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage(),
            nodeVersion: process.version
        };
    } catch (error) {
        logger.error('Error getting bot stats:', error);
        return {
            totalUsers: 0,
            totalCommands: 0,
            activeUsers: 0,
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage(),
            nodeVersion: process.version
        };
    }
}

// Format uptime to human readable
function formatUptime(seconds) {
    const days = Math.floor(seconds / (24 * 60 * 60));
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((seconds % (60 * 60)) / 60);
    const secs = Math.floor(seconds % 60);
    
    return `${days}d ${hours}h ${minutes}m ${secs}s`;
}

// Format memory usage
function formatMemory(bytes) {
    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(2)} MB`;
}

// Dashboard home
router.get('/', async (req, res) => {
    try {
        const stats = await getBotStats();
        
        res.render('dashboard/index', {
            title: 'SeaBot Dashboard',
            stats: {
                ...stats,
                uptimeFormatted: formatUptime(stats.uptime),
                memoryFormatted: {
                    rss: formatMemory(stats.memoryUsage.rss),
                    heapTotal: formatMemory(stats.memoryUsage.heapTotal),
                    heapUsed: formatMemory(stats.memoryUsage.heapUsed),
                    external: formatMemory(stats.memoryUsage.external)
                }
            },
            user: {
                loginTime: req.session.loginTime
            }
        });
    } catch (error) {
        logger.error('Dashboard error:', error);
        res.status(500).render('error', {
            title: 'Dashboard Error',
            error: {
                status: 500,
                message: 'Unable to load dashboard data'
            }
        });
    }
});

// API endpoint for real-time stats
router.get('/api/stats', async (req, res) => {
    try {
        const stats = await getBotStats();
        res.json({
            success: true,
            data: {
                ...stats,
                uptimeFormatted: formatUptime(stats.uptime),
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        logger.error('Stats API error:', error);
        res.status(500).json({
            success: false,
            error: 'Unable to fetch stats'
        });
    }
});

module.exports = router;