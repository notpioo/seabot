# Overview

SeaBot is a WhatsApp chatbot built using the Baileys library that provides automated responses and user management features. The bot connects to WhatsApp Web, handles incoming messages, processes commands with rate limiting, and maintains user profiles with a virtual economy system including balance, genesis points, and daily usage limits.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Bot Framework
- **WhatsApp Integration**: Uses @whiskeysockets/baileys library for WhatsApp Web connectivity
- **Authentication**: Multi-file auth state persistence for maintaining WhatsApp sessions
- **Connection Management**: Auto-reconnection logic with error handling and status monitoring
- **Message Processing**: Event-driven architecture handling message upserts and connection updates

## Command System
- **Modular Commands**: Plugin-based command architecture with individual command files
- **Prefix Support**: Multiple command prefixes (., !, #, /) for flexible user interaction
- **Command Registry**: Centralized command mapping in messageHandler for easy extensibility
- **Built-in Commands**: Ping (latency testing) and Profile (user information display)

## User Management
- **User Middleware**: Automatic user registration and profile management
- **Status Hierarchy**: Three-tier user system (Owner, Premium, Basic) with different privileges
- **Activity Tracking**: Last command timestamp and member registration date tracking
- **Profile Updates**: Dynamic push name updates and user data synchronization

## Rate Limiting & Economy
- **Daily Limits**: Command usage limits that reset every 24 hours for basic users
- **Cooldown System**: 2-second cooldown between commands to prevent spam
- **Virtual Economy**: Balance and genesis point system for potential future features
- **Privilege System**: Unlimited access for owners and premium users

## Data Layer
- **MongoDB Integration**: Mongoose ODM for database operations and schema management
- **User Schema**: Comprehensive user model with timestamps, limits, and economy fields
- **Connection Handling**: Robust database connection with error handling and auto-reconnection
- **Data Persistence**: User state and command history maintained across bot restarts

## Error Handling & Logging
- **Silent Logging**: Pino logger configured for minimal output during normal operation
- **Error Recovery**: Graceful error handling in commands and database operations
- **Connection Resilience**: Automatic reconnection for both WhatsApp and MongoDB connections
- **Debug Information**: Console logging for connection status and user registration events

# External Dependencies

## Core Dependencies
- **@whiskeysockets/baileys**: WhatsApp Web API client for bot connectivity and message handling
- **mongoose**: MongoDB object modeling for user data persistence and schema validation
- **@hapi/boom**: HTTP error handling library used by Baileys for connection error management
- **pino**: High-performance logging library for structured logging and debugging

## Utility Dependencies
- **moment**: Date and time manipulation for user registration dates and time formatting
- **dotenv**: Environment variable management for configuration and sensitive data

## Database
- **MongoDB**: NoSQL database for storing user profiles, limits, economy data, and activity logs
- **Connection**: Configured through environment variable MONGODB_URI with connection pooling

## Environment Configuration
- **BOT_NAME**: Customizable bot name (default: SeaBot)
- **OWNER_NUMBER**: WhatsApp number with owner privileges and unlimited access
- **MONGODB_URI**: Database connection string for user data persistence