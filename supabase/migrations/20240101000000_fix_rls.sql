-- Fix RLS Policies for Notifications
-- Ensure 'anon_id' and 'user_id' comparisons reflect correct ownership.

-- Assuming 'notifications' table is already created and RLS is enabled:
DROP POLICY IF EXISTS "Users can insert their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON notifications;
DROP POLICY IF EXISTS "Enable read for owner" ON notifications;
DROP POLICY IF EXISTS "Enable update for owner" ON notifications;

-- Policy to allow INSERT to `notifications` for any authenticated user
-- A user creates a notification FOR someone else
CREATE POLICY "Enable insert for authenticated users"
ON notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy to allow a user to view their own notifications
-- Assuming 'user_id' on notifications matches the 'anon_id' of the user who owns it
CREATE POLICY "Enable read for owner"
ON notifications
FOR SELECT
TO authenticated
USING (
  user_id = (SELECT anon_id FROM profiles WHERE id = auth.uid())
);

-- Policy to allow a user to update their own notifications (e.g., mark as read)
CREATE POLICY "Enable update for owner"
ON notifications
FOR UPDATE
TO authenticated
USING (
  user_id = (SELECT anon_id FROM profiles WHERE id = auth.uid())
)
WITH CHECK (
  user_id = (SELECT anon_id FROM profiles WHERE id = auth.uid())
);

-- Add public_key TEXT column to profiles table for E2E Encryption
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS public_key TEXT;

-- Create webhook_events table to track Stripe webhook idempotency
CREATE TABLE IF NOT EXISTS webhook_events (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create rate_limits table for distributed rate limiting
CREATE TABLE IF NOT EXISTS rate_limits (
    ip TEXT PRIMARY KEY,
    count INT NOT NULL DEFAULT 1,
    reset_time BIGINT NOT NULL
);

-- Protect rate_limits with RLS
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
-- For rate_limits, only allow service role or specific secure access, but since API routes might use anon key,
-- we can allow anonymous insert/update if needed, or simply use an RPC to bypass RLS safely.
-- Let's create an RPC for atomic increment that bypasses RLS safely.
CREATE OR REPLACE FUNCTION increment_rate_limit(client_ip TEXT, window_ms BIGINT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_time BIGINT := EXTRACT(EPOCH FROM NOW()) * 1000;
    new_count INT;
BEGIN
    INSERT INTO rate_limits (ip, count, reset_time)
    VALUES (client_ip, 1, current_time + window_ms)
    ON CONFLICT (ip) DO UPDATE
    SET count = CASE
        WHEN rate_limits.reset_time < current_time THEN 1
        ELSE rate_limits.count + 1
    END,
    reset_time = CASE
        WHEN rate_limits.reset_time < current_time THEN current_time + window_ms
        ELSE rate_limits.reset_time
    END
    RETURNING count INTO new_count;

    RETURN new_count;
END;
$$;
