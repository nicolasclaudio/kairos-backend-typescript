/**
 * Manual Test Script for UserRepository
 * Run with: npm run dev (and execute this logic in src/index.ts temporarily)
 */

import { UserRepository } from './infrastructure/repositories/user.repository.js';

async function testUserRepository() {
    const userRepo = new UserRepository();

    console.log('🧪 Testing UserRepository...\n');

    try {
        // Test 1: Create a new user
        console.log('📝 Test 1: Creating a new user...');
        const newUser = await userRepo.create({
            telegramId: '123456789',
            username: 'test_user',
            timezone: 'America/Mexico_City',
            workStartTime: '09:00',
            workEndTime: '18:00',
            initialVelocityMultiplier: 1.0,
        });
        console.log('✅ User created:', newUser);

        // Test 2: Find user by Telegram ID
        console.log('\n🔍 Test 2: Finding user by Telegram ID...');
        const foundUser = await userRepo.findByTelegramId('123456789');
        console.log('✅ User found:', foundUser);

        // Test 3: Try to find non-existent user
        console.log('\n❌ Test 3: Finding non-existent user...');
        const notFound = await userRepo.findByTelegramId('999999');
        console.log('✅ Result (should be null):', notFound);

        console.log('\n🎉 All tests passed!');
    } catch (error) {
        console.error('💥 Test failed:', error);
    }
}

export { testUserRepository };
