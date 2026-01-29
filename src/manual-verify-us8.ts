
import { UserRepository } from './infrastructure/repositories/user.repository.js';
import { TaskRepository } from './infrastructure/repositories/task.repository.js';
import { GoalRepository } from './infrastructure/repositories/goal.repository.js';
import { PlannerService } from './domain/services/planner.service.js';

async function run() {
    console.log('🧪 VERIFICACIÓN MANUAL US#8: Sensor de Energía\n');

    const userRepo = new UserRepository();
    const taskRepo = new TaskRepository();
    const goalRepo = new GoalRepository();
    const plannerService = new PlannerService(taskRepo);

    // Identificador único para esta corrida
    const telegramId = Date.now().toString();

    // 1. Crear Usuario
    console.log('1️⃣ Creando Usuario Test...');
    const user = await userRepo.create({
        telegramId,
        username: 'EnergyTester',
        timezone: 'UTC',
        workStartTime: '09:00',
        workEndTime: '18:00',
        initialVelocityMultiplier: 1.0,
        currentEnergy: 3
    });
    console.log(`   User ID: ${user.id} | Energy Inicial: ${user.currentEnergy}`);

    // 2. Crear Metas y Tareas
    console.log('\n2️⃣ Creando Tareas con diferentes Energías...');

    // Goal
    const goal = await goalRepo.create({
        userId: user.id,
        title: 'Entrenamiento Espartano',
        metaScore: 5,
        status: 'active'
    });

    // Tarea Pesada (Energy 5)
    await taskRepo.create({
        userId: user.id,
        goalId: goal.id,
        title: 'Levantar 100kg (Heavy)',
        estimatedMinutes: 60,
        requiredEnergy: 5, // Requiere mucha energía
        status: 'pending'
    });

    // Tarea Ligera (Energy 1)
    await taskRepo.create({
        userId: user.id,
        goalId: goal.id,
        title: 'Estirar (Light)',
        estimatedMinutes: 15,
        requiredEnergy: 1, // Requiere poca energía
        status: 'pending'
    });

    // Tarea Media (Energy 3)
    await taskRepo.create({
        userId: user.id,
        goalId: goal.id,
        title: 'Trotar (Medium)',
        estimatedMinutes: 30,
        requiredEnergy: 3,
        status: 'pending'
    });

    console.log('   Tareas creadas: Heavy (5), Light (1), Medium (3)');

    // 3. Caso A: Usuario Agotado (Energy 1)
    console.log('\n3️⃣ CASO A: Usuario Agotado (Energy = 1)');
    await userRepo.updateEnergy(user.id, 1);
    const planA = await plannerService.generateDailyPlan(user.id, 1);

    console.log('--- PLAN A (Low Energy) ---');
    console.log(extractPlanOrder(planA));

    // 4. Caso B: Usuario Enérgico (Energy 5)
    console.log('\n4️⃣ CASO B: Usuario Enérgico (Energy = 5)');
    await userRepo.updateEnergy(user.id, 5);
    const planB = await plannerService.generateDailyPlan(user.id, 5);

    console.log('--- PLAN B (High Energy) ---');
    console.log(extractPlanOrder(planB));

    console.log('\n✅ Fin de verificación.');
    process.exit(0);
}

// Helper para limpiar el output del plan y mostrar solo el orden
function extractPlanOrder(plan: string): string {
    return plan.split('\n')
        .filter(line => line.includes('#')) // Filtrar lineas con ID de tarea
        .map(line => line.trim())
        .join('\n');
}

run().catch(console.error);
