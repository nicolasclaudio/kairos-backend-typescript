-- Migration 010: Create Notifications Table
-- Description: Creates the notifications table to store user notifications

CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    related_entity_type VARCHAR(50), -- 'task', 'goal', 'project'
    related_entity_id INTEGER,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP
);

-- Indexes for optimized queries
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- Add check constraint for notification types
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
    CHECK (type IN ('task_reminder', 'streak_celebration', 'low_impact_warning', 'goal_deadline'));

-- Add check constraint for related entity types
ALTER TABLE notifications ADD CONSTRAINT notifications_entity_type_check 
    CHECK (related_entity_type IS NULL OR related_entity_type IN ('task', 'goal', 'project'));
