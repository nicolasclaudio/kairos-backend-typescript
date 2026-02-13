-- Migration 011: Enrich Schema for Frontend Parity
-- Description: Adds tags, description, planning fields to tasks and color/icon to projects

-- Projects Table Extensions
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS color VARCHAR(20) DEFAULT '#6366f1',
ADD COLUMN IF NOT EXISTS icon VARCHAR(50);

-- Tasks Table Extensions
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS planned_at DATE,
ADD COLUMN IF NOT EXISTS focus_priority INTEGER CHECK (focus_priority BETWEEN 1 AND 3),
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS actual_minutes INTEGER DEFAULT 0;

-- Indexes for new query patterns
CREATE INDEX IF NOT EXISTS idx_tasks_planned_at ON tasks(planned_at);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_tags ON tasks USING GIN(tags);
