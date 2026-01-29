-- Migration 003: Add energy context columns
-- US#8: Energy Sensor

-- Add required_energy to tasks (Scale 1-5, default 3)
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS required_energy INTEGER NOT NULL DEFAULT 3 
CHECK (required_energy BETWEEN 1 AND 5);

-- Add current_energy to users (Scale 1-5, default 3)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS current_energy INTEGER NOT NULL DEFAULT 3 
CHECK (current_energy BETWEEN 1 AND 5);
