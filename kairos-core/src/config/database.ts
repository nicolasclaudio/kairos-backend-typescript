/**
 * Database Configuration
 * Database connection and configuration management
 */

export interface DatabaseConfig {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
}

export function getDatabaseConfig(): DatabaseConfig {
    return {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        database: process.env.DB_NAME || 'kairos',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
    };
}

export function getDatabaseUrl(): string {
    return process.env.DATABASE_URL || 'postgresql://localhost:5432/kairos';
}
