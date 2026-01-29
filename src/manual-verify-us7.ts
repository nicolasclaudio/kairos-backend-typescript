
import { UserRepository } from './infrastructure/repositories/user.repository.js';
import { GoalRepository } from './infrastructure/repositories/goal.repository.js';
import { TaskRepository } from './infrastructure/repositories/task.repository.js';
import { PlannerService } from './domain/services/planner.service.js';

async function main() {
    console.log('🧪 VERIFICACIÓN MANUAL US#7: Status & Feedback\n');

    const userRepo = new UserRepository();
    const goalRepo = new GoalRepository();
    const taskRepo = new TaskRepository();
    const plannerService = new PlannerService(taskRepo);

    const telegramId = Date.now().toString(); // Use numeric string to be safe

    // 1. Crear Usuario
    console.log('1️⃣ Creando Usuario...');
    const user = await userRepo.create({
        telegramId,
        username: 'StatusTester',
        timezone: 'UTC',
        workStartTime: '09:00',
        workEndTime: '18:00',
        initialVelocityMultiplier: 1.0
    });
    console.log(`User ID: ${user.id}`);

    // 2. Crear Goal
    console.log('\n2️⃣ Creando Meta...');
    const goal = await goalRepo.create({
        userId: user.id,
        title: 'Meta de Prueba',
        metaScore: 10,
        status: 'active'
    });
    console.log(`Goal ID: ${goal.id}`);

    // 3. Crear Tasks
    console.log('\n3️⃣ Creando Tareas...');
    const t1 = await taskRepo.create({
        userId: user.id,
        goalId: goal.id,
        title: 'Tarea 1 (Fixed)',
        status: 'pending',
        isFixed: true,
        priorityOverride: 5,
        estimatedMinutes: 30
    });
    const t2 = await taskRepo.create({
        userId: user.id,
        goalId: goal.id,
        title: 'Tarea 2 (To Complete)',
        status: 'pending',
        estimatedMinutes: 45
    });
    console.log(`Created Task ${t1.id} & ${t2.id}`);

    // 4. Verificar Plan Inicial
    console.log('\n4️⃣ Generando Plan (Pre-Done)...');
    const plan1 = await plannerService.generateDailyPlan(user.id);
    console.log(plan1); // Should show IDs

    // 5. Marcar Tarea 2 como Done
    console.log('\n5️⃣ Ejecutando /done en Tarea 2...');
    const doneSuccess = await taskRepo.markAsDone(t2.id, user.id);
    console.log(`MarkAsDone Result: ${doneSuccess}`);

    // 6. Verificar Stats
    console.log('\n6️⃣ Obteniendo Daily Stats...');
    const stats = await taskRepo.getDailyStats(user.id);
    const remaining = await taskRepo.getTotalRemainingMinutes(user.id);
    console.log(`Completed Today: ${stats.completed} (Expected: 1)`);
    console.log(`Remaining Minutes: ${remaining} (Expected: 30)`);

    if (stats.completed !== 1) console.error('❌ Error: Completed count mismatch');
    if (remaining !== 30) console.error('❌ Error: Remaining minutes mismatch');

    // 7. Verificar Plan Nuevo (T2 ya no debería salir)
    console.log('\n7️⃣ Generando Plan (Post-Done)...');
    const plan2 = await plannerService.generateDailyPlan(user.id);
    console.log(plan2);

    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
