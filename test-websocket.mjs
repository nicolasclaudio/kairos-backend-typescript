#!/usr/bin/env node
/**
 * WebSocket Manual Test Client
 * Tests real-time events from Kairos backend
 */

import { io } from 'socket.io-client';

// Replace with your actual JWT token
const JWT_TOKEN = process.env.JWT_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJuaWNvbGFzLmNsYXVkaW8wMEBnbWFpbC5jb20iLCJ0ZWxlZ3JhbUlkIjoiMTUwMjM2ODUzOCIsImlhdCI6MTc3MDc1NTY5MiwiZXhwIjoxNzcwODQyMDkyfQ.zKMu8nrSS5hCeIUTt9NsJs6_2WgB74LFGTwo1mq_4zw';

const WS_URL = process.env.WS_URL || 'http://localhost:3000';

console.log('🔌 Connecting to WebSocket server...');
console.log(`URL: ${WS_URL}`);

const socket = io(WS_URL, {
    auth: {
        token: JWT_TOKEN
    },
    transports: ['websocket', 'polling']
});

socket.on('connect', () => {
    console.log('✅ Connected to WebSocket');
    console.log(`Socket ID: ${socket.id}`);
});

socket.on('connected', (data) => {
    console.log('📩 Welcome message from server:', data);
});

socket.on('TASK_UPDATED', (payload) => {
    console.log('\n📡 TASK_UPDATED event received:');
    console.log(JSON.stringify(payload, null, 2));
});

socket.on('GOAL_ACHIEVED', (payload) => {
    console.log('\n🎯 GOAL_ACHIEVED event received:');
    console.log(JSON.stringify(payload, null, 2));
});

socket.on('NOTIFICATION_RECEIVED', (payload) => {
    console.log('\n🔔 NOTIFICATION_RECEIVED event received:');
    console.log(JSON.stringify(payload, null, 2));
});

socket.on('connect_error', (error) => {
    console.error('❌ Connection error:', error.message);
});

socket.on('disconnect', (reason) => {
    console.log(`❌ Disconnected: ${reason}`);
});

socket.on('error', (error) => {
    console.error('⚠️  Socket error:', error);
});

console.log('\n📝 Listening for events...');
console.log('   - TASK_UPDATED');
console.log('   - GOAL_ACHIEVED');
console.log('   - NOTIFICATION_RECEIVED');
console.log('\nPress Ctrl+C to exit\n');

// Keep process alive
process.on('SIGINT', () => {
    console.log('\n👋 Closing connection...');
    socket.disconnect();
    process.exit(0);
});
