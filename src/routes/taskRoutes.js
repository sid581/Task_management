import express from 'express';
import {
    createTask,
    getAllTasks,
    getTaskById,
    updateTask,
    assignTask,
    updateTaskStatus,
    deleteTask
} from '../controllers/taskController.js';
import authenticateUser from '../middleware/authMiddleware.js';
import authorizeRole from '../middleware/authorizeRole.js';

const router = express.Router();

// Protect all task endpoints with JWT authentication
router.use(authenticateUser);

/**
 * Task Routes:
 *
 * GET /api/tasks
 *   - Admin: sees all tasks (can filter with ?status=... or ?assigned_to=...)
 *   - Employee: sees ONLY tasks assigned to them
 *
 * GET /api/tasks/:id
 *   - Admin: can view any task
 *   - Employee: can view ONLY if task is assigned to them
 *
 * POST /api/tasks
 *   - Admin only: creates tasks and optionally assigns to employee
 *
 * PUT /api/tasks/:id
 *   - Admin only: updates task details (title, description, status, assigned_to, due_date)
 *
 * PATCH /api/tasks/:id/assign
 *   - Admin only: assigns / reassigns task to an employee
 *
 * PATCH /api/tasks/:id/status
 *   - Admin and Employee: updates task status
 *   - Employee is restricted to only their assigned tasks
 *
 * DELETE /api/tasks/:id
 *   - Admin only: deletes a task
 */

router.get('/', getAllTasks);
router.get('/:id', getTaskById);

router.post('/', authorizeRole('admin'), createTask);
router.put('/:id', authorizeRole('admin'), updateTask);
router.patch('/:id/assign', authorizeRole('admin'), assignTask);
router.patch('/:id/status', updateTaskStatus);
router.delete('/:id', authorizeRole('admin'), deleteTask);

export default router;
