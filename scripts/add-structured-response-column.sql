-- Migration script to add structured_response column to chat_message table
-- Run this script if the column doesn't exist yet

-- Add structured_response column if it doesn't exist
ALTER TABLE csi.chat_message 
ADD COLUMN IF NOT EXISTS structured_response JSONB NULL;

-- Add comment to document the column
COMMENT ON COLUMN csi.chat_message.structured_response IS 'Structured chat response data in JSON format (StructuredChatResponse)';
