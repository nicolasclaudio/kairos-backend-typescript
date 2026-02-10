/**
 * WebSocket Service
 * Manages real-time bidirectional communication with Socket.IO
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { WebSocketEvent } from '../../domain/websocket.types.js';

interface SocketData {
    userId: number;
    email: string;
}

export class WebSocketService {
    private io: SocketIOServer;
    private static instance: WebSocketService | null = null;

    private constructor(httpServer: HttpServer) {
        this.io = new SocketIOServer(httpServer, {
            cors: {
                origin: process.env.FRONTEND_URL || 'http://localhost:5173',
                credentials: true
            },
            transports: ['websocket', 'polling'],
            pingInterval: parseInt(process.env.WS_PING_INTERVAL || '25000'),
            pingTimeout: parseInt(process.env.WS_PING_TIMEOUT || '20000'),
            maxHttpBufferSize: 1e6 // 1MB max message size
        });

        this.setupMiddleware();
        this.setupConnectionHandlers();

        console.log('🔌 WebSocket Service initialized');
    }

    /**
     * Get singleton instance
     */
    static getInstance(httpServer?: HttpServer): WebSocketService {
        if (!WebSocketService.instance) {
            if (!httpServer) {
                throw new Error('HttpServer required for first initialization');
            }
            WebSocketService.instance = new WebSocketService(httpServer);
        }
        return WebSocketService.instance;
    }

    /**
     * Middleware: Authenticate JWT token in handshake
     */
    private setupMiddleware(): void {
        this.io.use((socket: Socket, next) => {
            const token = socket.handshake.auth.token ||
                socket.handshake.headers.authorization?.split(' ')[1];

            if (!token) {
                return next(new Error('Authentication error: Token required'));
            }

            try {
                const jwtSecret = process.env.JWT_SECRET;
                if (!jwtSecret) {
                    throw new Error('JWT_SECRET not configured');
                }

                const decoded = jwt.verify(token, jwtSecret) as any;
                socket.data.userId = decoded.id;
                socket.data.email = decoded.email;
                next();
            } catch (error: any) {
                next(new Error('Authentication error: Invalid token'));
            }
        });
    }

    /**
     * Handle new connections
     */
    private setupConnectionHandlers(): void {
        this.io.on('connection', (socket: Socket) => {
            const socketData = socket.data as SocketData;
            const userId = socketData.userId;

            console.log(`✅ WebSocket client connected: user ${userId}`);

            // Join user-specific room
            socket.join(`user:${userId}`);

            socket.on('disconnect', (reason: string) => {
                console.log(`❌ WebSocket client disconnected: user ${userId}, reason: ${reason}`);
            });

            socket.on('error', (error: Error) => {
                console.error(`⚠️  WebSocket error for user ${userId}:`, error);
            });

            // Send welcome message
            socket.emit('connected', {
                message: 'Connected to Kairos WebSocket',
                userId
            });
        });
    }

    /**
     * Broadcast event to specific user
     */
    emit(event: WebSocketEvent): void {
        const room = `user:${event.userId}`;
        this.io.to(room).emit(event.type, event.payload);
        console.log(`📡 Emitted ${event.type} to user ${event.userId}`);
    }

    /**
     * Broadcast to all connected clients (admin only)
     */
    broadcast(eventType: string, payload: any): void {
        this.io.emit(eventType, payload);
    }

    /**
     * Get connection count for monitoring
     */
    getConnectionCount(): number {
        return this.io.sockets.sockets.size;
    }

    /**
     * Get connected users
     */
    getConnectedUsers(): number[] {
        const users: Set<number> = new Set();
        this.io.sockets.sockets.forEach((socket: Socket) => {
            const socketData = socket.data as SocketData;
            if (socketData.userId) {
                users.add(socketData.userId);
            }
        });
        return Array.from(users);
    }

    /**
     * Get stats for monitoring
     */
    getStats(): { connections: number; connectedUsers: number[]; roomCount: number } {
        return {
            connections: this.getConnectionCount(),
            connectedUsers: this.getConnectedUsers(),
            roomCount: this.io.sockets.adapter.rooms.size
        };
    }

    /**
     * Get Socket.IO instance (for testing)
     */
    getIO(): SocketIOServer {
        return this.io;
    }
}
