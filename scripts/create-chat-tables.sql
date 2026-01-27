-- Create chat tables in CSI schema
-- Run this script against your PostgreSQL database to create the required chat tables

-- Create chat_session table
CREATE TABLE IF NOT EXISTS csi.chat_session (
    session_id UUID PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP NULL,
    total_messages INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create chat_message table
CREATE TABLE IF NOT EXISTS csi.chat_message (
    id SERIAL PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES csi.chat_session(session_id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    reasoning_steps JSONB NULL,
    data_sources JSONB NULL,
    structured_response JSONB NULL,
    tokens_used INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_session_user_id ON csi.chat_session(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_session_started_at ON csi.chat_session(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_message_session_id ON csi.chat_message(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_message_created_at ON csi.chat_message(created_at);

-- Migration: If chat_message table already exists, add structured_response column:
-- ALTER TABLE csi.chat_message ADD COLUMN IF NOT EXISTS structured_response JSONB NULL;

-- Grant permissions (adjust as needed for your database user)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON csi.chat_session TO your_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON csi.chat_message TO your_user;
-- GRANT USAGE, SELECT ON SEQUENCE csi.chat_message_id_seq TO your_user;
