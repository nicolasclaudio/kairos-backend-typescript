
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../entities.js';
import { IUserRepository } from '../../infrastructure/repositories/user.repository.js';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const SALT_ROUNDS = 10;

export class AuthService {
    constructor(private userRepository: IUserRepository) { }

    async register(data: any): Promise<{ user: User; token: string }> {
        const { email, password, telegramId, ...otherData } = data;

        if (!email || !password) {
            throw new Error('Email and password are required');
        }

        const existingUser = await this.userRepository.findByEmail(email);
        if (existingUser) {
            throw new Error('User already exists');
        }

        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        const newUser = await this.userRepository.create({
            ...otherData,
            email,
            passwordHash,
            telegramId, // Make sure this is handled or optional if coming from web
            workStartTime: otherData.workStartTime || '09:00',
            workEndTime: otherData.workEndTime || '17:00',
            initialVelocityMultiplier: otherData.initialVelocityMultiplier || 1.0,
            timezone: otherData.timezone || 'UTC',
            currentEnergy: 3
        });

        const token = this.generateToken(newUser);

        return { user: newUser, token };
    }

    async login(data: any): Promise<{ token: string; user: User }> {
        const { email, password } = data;

        if (!email || !password) {
            throw new Error('Email and password are required');
        }

        const user = await this.userRepository.findByEmail(email);
        if (!user || !user.passwordHash) {
            throw new Error('Invalid credentials');
        }

        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            throw new Error('Invalid credentials');
        }

        const token = this.generateToken(user);

        return { token, user };
    }

    private generateToken(user: User): string {
        return jwt.sign(
            { id: user.id, email: user.email, telegramId: user.telegramId },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
    }

    verifyToken(token: string): any {
        return jwt.verify(token, JWT_SECRET);
    }
}
