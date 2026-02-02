-- Add email and password_hash to users table
ALTER TABLE users 
ADD COLUMN email VARCHAR(255) UNIQUE,
ADD COLUMN password_hash VARCHAR(255);

-- Create index for email lookups
CREATE INDEX idx_users_email ON users(email);
