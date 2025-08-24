const mongoose = require('mongoose');
const config = require('../config/bot');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(config.mongodbUri);
        
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }
};

module.exports = connectDB;
