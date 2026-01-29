ALTER TABLE tasks ADD COLUMN scheduled_start_time TIMESTAMP;
ALTER TABLE tasks ADD COLUMN duration_minutes INTEGER DEFAULT 30;
