-- Migration: Update tasks table for US#4
-- This script recreates the tasks table with goal_id support

-- Step 1: Drop existing tasks table
DROP TABLE IF EXISTS tasks CASCADE;

-- Step 2: Recreate tasks table with new schema
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    goal_id INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    project_id INTEGER,
    title VARCHAR(255) NOT NULL,
    estimated_minutes INTEGER NOT NULL DEFAULT 30,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done', 'archived')),
    priority_override INTEGER DEFAULT 3 CHECK (priority_override BETWEEN 1 AND 5),
    is_fixed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Step 3: Recreate indexes
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_goal_id ON tasks(goal_id);
CREATE INDEX idx_tasks_status ON tasks(status);

-- Step 4: Recreate trigger
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
