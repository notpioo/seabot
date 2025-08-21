# Overview

SeaBot is a WhatsApp chatbot built with Node.js that provides automated messaging capabilities through the WhatsApp Business API. The bot uses Baileys library for WhatsApp integration and MongoDB for data persistence. It features a modular command system, user management, session handling, and comprehensive logging capabilities.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Core Architecture
- **Runtime Environment**: Node.js with asynchronous event-driven architecture
- **WhatsApp Integration**: Baileys library (@whiskeysockets/baileys) for direct WhatsApp Web API communication
- **Database Layer**: MongoDB with Mongoose ODM for data modeling and queries
- **Authentication**: Multi-file auth state management for WhatsApp session persistence
- **Logging System**: Winston logger with file and console outputs, configurable log levels

## Bot Framework Design
- **Command System**: Modular command architecture with dynamic loading and registration
- **Message Handling**: Event-driven message processing with prefix-based command detection
- **User Management**: Comprehensive user profiling with permissions, banning, and statistics tracking
- **Session Management**: Persistent WhatsApp session storage with automatic reconnection handling

## Configuration Management
- **Environment-based Config**: Centralized configuration with environment variable support
- **Multi-prefix Support**: Flexible command prefixes (., !, #, /) for user convenience
- **Connection Management**: Robust database connection handling with retry logic and exponential backoff

## Error Handling & Resilience
- **Graceful Shutdown**: SIGINT/SIGTERM signal handling for clean process termination
- **Unhandled Exception Catching**: Global error handlers for uncaught exceptions and promise rejections
- **Connection Recovery**: Automatic database and WhatsApp reconnection with configurable retry limits
- **Rate Limiting**: Built-in cooldown and rate limiting system for command usage

## Data Models
- **User Model**: Stores user profiles, permissions, statistics, and ban management
- **Session Model**: Manages WhatsApp session data, device info, and connection tracking
- **Settings System**: User-specific configuration storage for personalized bot behavior

# External Dependencies

## Primary Services
- **MongoDB Atlas**: Cloud database service for user data, sessions, and bot configuration storage
- **WhatsApp Business API**: Real-time messaging through Baileys WebSocket connection

## Core Libraries
- **@whiskeysockets/baileys**: WhatsApp Web API client for message sending/receiving
- **mongoose**: MongoDB object modeling for Node.js with built-in validation
- **winston**: Comprehensive logging library with multiple transport options
- **pino**: High-performance JSON logger used internally by Baileys

## Utilities
- **qrcode-terminal**: Terminal QR code generation for WhatsApp authentication
- **dotenv**: Environment variable management for secure configuration
- **fs/path**: Native Node.js modules for file system operations and session management

## Development Tools
- **npm**: Package management and dependency resolution
- **nodemon**: Development server with automatic restart capabilities (implied usage)