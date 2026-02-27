-- AI Architect Database Schema
-- MySQL 8.0+

CREATE DATABASE IF NOT EXISTS ai_architect CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ai_architect;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    username VARCHAR(255) PRIMARY KEY,
    hashed_password VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    plan VARCHAR(50) DEFAULT 'free',
    plan_expires_at DATETIME,
    disabled BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_plan (plan)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Agents table
CREATE TABLE IF NOT EXISTS agents (
    id VARCHAR(255) PRIMARY KEY,
    user_username VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(255),
    avatar VARCHAR(50),
    idea TEXT,
    full_response TEXT,
    chat_history TEXT DEFAULT '[]',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user (user_username),
    INDEX idx_created (created_at),
    FOREIGN KEY (user_username) REFERENCES users(username) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Usage events table
CREATE TABLE IF NOT EXISTS usage_events (
    id VARCHAR(255) PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    event_type VARCHAR(50) DEFAULT 'generation',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_event_type (event_type),
    INDEX idx_created (created_at),
    FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create default admin user (password: admin123)
INSERT IGNORE INTO users (username, hashed_password, plan, email) 
VALUES (
    'admin',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzS3MebAJu',
    'admin',
    'admin@aiarchitect.local'
);

-- Grant privileges (replace 'your_user' with actual MySQL username)
-- GRANT ALL PRIVILEGES ON ai_architect.* TO 'your_user'@'localhost' IDENTIFIED BY 'your_password';
-- FLUSH PRIVILEGES;
