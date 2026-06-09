-- Migration: Create applications table
-- Description: Creates the schema for storing borrower applications

CREATE TABLE IF NOT EXISTS applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    mobile VARCHAR(15) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    purpose TEXT NOT NULL,
    language VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index on status for faster filtering
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);

-- Index on created_at for fast descending sort
CREATE INDEX IF NOT EXISTS idx_applications_created_at ON applications(created_at DESC);
