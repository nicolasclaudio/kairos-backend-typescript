-- Migration 011: Create Notification Settings Table
-- Description: Creates the notification_settings table to store user notification preferences

CREATE TABLE notification_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    enable_task_reminders BOOLEAN DEFAULT TRUE,
    enable_streak_celebrations BOOLEAN DEFAULT TRUE,
    enable_low_impact_warnings BOOLEAN DEFAULT TRUE,
    enable_goal_deadlines BOOLEAN DEFAULT TRUE,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for quick lookups by user
CREATE INDEX idx_notification_settings_user_id ON notification_settings(user_id);

-- Add comment for clarity
COMMENT ON TABLE notification_settings IS 'Stores user preferences for different types of notifications';
COMMENT ON COLUMN notification_settings.quiet_hours_start IS 'Start time for quiet hours (no notifications)';
COMMENT ON COLUMN notification_settings.quiet_hours_end IS 'End time for quiet hours (no notifications)';
