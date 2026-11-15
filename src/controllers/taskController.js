import pool from '../config/database.js';

const VALID_STATUSES = ['pending', 'in_progress', 'completed'];

/**
 * Normalizes input status (e.g., 'inprogress' -> 'in_progress')
 * and verifies it matches allowed database check constraint values.
 */
const normalizeStatus = (status) => {
    if (!status || typeof status !== 'string') return null;
    const normalized = status.trim().toLowerCase().replace(/\s+|-/g, '_');
    if (normalized === 'inprogress') {
        return 'in_progress';
    }
    if (VALID_STATUSES.includes(normalized)) {
        return normalized;
    }
    return null;
};

/**
 * Helper to fetch a task with creator and assignee user details.
 */
const fetchTaskDetailsById = async (taskId) => {
    const query = `
        SELECT 
            t.id,
            t.title,
            t.description,
            t.status,
            t.due_date,
            t.created_at,
            t.updated_at,
            t.created_by,
            creator.name AS created_by_name,
            creator.email AS created_by_email,
            t.assigned_to,
            assignee.name AS assigned_to_name,
            assignee.email AS assigned_to_email
        FROM tasks t
        LEFT JOIN users creator ON t.created_by = creator.id
        LEFT JOIN users assignee ON t.assigned_to = assignee.id
        WHERE t.id = $1
    `;
    const result = await pool.query(query, [taskId]);
    return result.rows[0] || null;
};

/**
 * @desc   Create a new task
 * @route  POST /api/tasks
 * @access Admin only
 */
export const createTask = async (req, res) => {
    try {
        const { title, description, assigned_to, due_date, status } = req.body;

        if (!title || !title.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Task title is required'
            });
        }

        let taskStatus = 'pending';
        if (status) {
            const parsedStatus = normalizeStatus(status);
            if (!parsedStatus) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid status. Allowed values: ${VALID_STATUSES.join(', ')} (or inprogress)`
                });
            }
            taskStatus = parsedStatus;
        }

        let assignedUserId = null;
        if (assigned_to !== undefined && assigned_to !== null && assigned_to !== '') {
            const userCheck = await pool.query(
                'SELECT id, name, role FROM users WHERE id = $1',
                [assigned_to]
            );

            if (userCheck.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: `Assigned user with ID ${assigned_to} does not exist`
                });
            }
            assignedUserId = assigned_to;
        }

        const insertQuery = `
            INSERT INTO tasks (title, description, status, assigned_to, created_by, due_date)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
        `;

        const newRecord = await pool.query(insertQuery, [
            title.trim(),
            description || null,
            taskStatus,
            assignedUserId,
            req.user.id,
            due_date || null
        ]);

        const createdTask = await fetchTaskDetailsById(newRecord.rows[0].id);

        return res.status(201).json({
            success: true,
            message: 'Task created successfully',
            data: createdTask
        });
    } catch (error) {
        console.error('Error creating task:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

/**
 * @desc   View all tasks
 *         - Admin: can view all tasks (with optional filter by status or assigned_to)
 *         - Employee: can ONLY view tasks assigned to them
 * @route  GET /api/tasks
 * @access Admin and Employee
 */
export const getAllTasks = async (req, res) => {
    try {
        const { role, id: userId } = req.user;
        const { status, assigned_to } = req.query;

        let query = `
            SELECT 
                t.id,
                t.title,
                t.description,
                t.status,
                t.due_date,
                t.created_at,
                t.updated_at,
                t.created_by,
                creator.name AS created_by_name,
                creator.email AS created_by_email,
                t.assigned_to,
                assignee.name AS assigned_to_name,
                assignee.email AS assigned_to_email
            FROM tasks t
            LEFT JOIN users creator ON t.created_by = creator.id
            LEFT JOIN users assignee ON t.assigned_to = assignee.id
            WHERE 1=1
        `;

        const values = [];
        let paramIndex = 1;

        if (role === 'employee') {
            // Employees can ONLY view tasks assigned to themselves
            query += ` AND t.assigned_to = $${paramIndex}`;
            values.push(userId);
            paramIndex++;
        } else if (role === 'admin') {
            // Admins can optionally filter by assigned_to
            if (assigned_to) {
                query += ` AND t.assigned_to = $${paramIndex}`;
                values.push(assigned_to);
                paramIndex++;
            }
        } else {
            return res.status(403).json({
                success: false,
                message: 'Access denied: invalid role'
            });
        }

        // Optional status filter
        if (status) {
            const parsedStatus = normalizeStatus(status);
            if (parsedStatus) {
                query += ` AND t.status = $${paramIndex}`;
                values.push(parsedStatus);
                paramIndex++;
            }
        }

        query += ' ORDER BY t.created_at DESC';

        const result = await pool.query(query, values);

        return res.status(200).json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching tasks:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

/**
 * @desc   View task by ID
 *         - Admin: can view any task
 *         - Employee: can ONLY view if assigned to them
 * @route  GET /api/tasks/:id
 * @access Admin and Employee
 */
export const getTaskById = async (req, res) => {
    try {
        const taskId = parseInt(req.params.id, 10);
        if (isNaN(taskId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid task ID'
            });
        }

        const task = await fetchTaskDetailsById(taskId);

        if (!task) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        // Employee restriction: only view their assigned tasks
        if (req.user.role === 'employee' && task.assigned_to !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to view this task'
            });
        }

        return res.status(200).json({
            success: true,
            data: task
        });
    } catch (error) {
        console.error('Error fetching task by id:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

/**
 * @desc   Update a task (title, description, status, assigned_to, due_date)
 * @route  PUT /api/tasks/:id
 * @access Admin only
 */
export const updateTask = async (req, res) => {
    try {
        const taskId = parseInt(req.params.id, 10);
        if (isNaN(taskId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid task ID'
            });
        }

        const existingTask = await pool.query('SELECT * FROM tasks WHERE id = $1', [taskId]);
        if (existingTask.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        const { title, description, status, assigned_to, due_date } = req.body;

        const currentTask = existingTask.rows[0];

        let updatedTitle = currentTask.title;
        if (title !== undefined) {
            if (!title.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'Task title cannot be empty'
                });
            }
            updatedTitle = title.trim();
        }

        let updatedStatus = currentTask.status;
        if (status !== undefined) {
            const parsedStatus = normalizeStatus(status);
            if (!parsedStatus) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid status. Allowed values: ${VALID_STATUSES.join(', ')} (or inprogress)`
                });
            }
            updatedStatus = parsedStatus;
        }

        let updatedAssignedTo = currentTask.assigned_to;
        if (assigned_to !== undefined) {
            if (assigned_to === null || assigned_to === '') {
                updatedAssignedTo = null;
            } else {
                const userCheck = await pool.query(
                    'SELECT id, name, role FROM users WHERE id = $1',
                    [assigned_to]
                );
                if (userCheck.rows.length === 0) {
                    return res.status(404).json({
                        success: false,
                        message: `Assigned user with ID ${assigned_to} does not exist`
                    });
                }
                updatedAssignedTo = assigned_to;
            }
        }

        const updatedDescription = description !== undefined ? description : currentTask.description;
        const updatedDueDate = due_date !== undefined ? due_date : currentTask.due_date;

        const updateQuery = `
            UPDATE tasks
            SET 
                title = $1,
                description = $2,
                status = $3,
                assigned_to = $4,
                due_date = $5,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $6
        `;

        await pool.query(updateQuery, [
            updatedTitle,
            updatedDescription,
            updatedStatus,
            updatedAssignedTo,
            updatedDueDate,
            taskId
        ]);

        const updatedTask = await fetchTaskDetailsById(taskId);

        return res.status(200).json({
            success: true,
            message: 'Task updated successfully',
            data: updatedTask
        });
    } catch (error) {
        console.error('Error updating task:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

/**
 * @desc   Assign or reassign a task to an employee
 * @route  PATCH /api/tasks/:id/assign
 * @access Admin only
 */
export const assignTask = async (req, res) => {
    try {
        const taskId = parseInt(req.params.id, 10);
        if (isNaN(taskId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid task ID'
            });
        }

        const taskCheck = await pool.query('SELECT id FROM tasks WHERE id = $1', [taskId]);
        if (taskCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        const targetUser = req.body.assigned_to !== undefined 
            ? req.body.assigned_to 
            : (req.body.employee_id !== undefined ? req.body.employee_id : req.body.userId);

        let assignedUserId = null;
        if (targetUser !== null && targetUser !== undefined && targetUser !== '') {
            const userCheck = await pool.query(
                'SELECT id, name, role FROM users WHERE id = $1',
                [targetUser]
            );

            if (userCheck.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: `User with ID ${targetUser} does not exist`
                });
            }
            assignedUserId = targetUser;
        }

        await pool.query(
            `UPDATE tasks 
             SET assigned_to = $1, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $2`,
            [assignedUserId, taskId]
        );

        const updatedTask = await fetchTaskDetailsById(taskId);

        return res.status(200).json({
            success: true,
            message: assignedUserId ? 'Task assigned successfully' : 'Task unassigned successfully',
            data: updatedTask
        });
    } catch (error) {
        console.error('Error assigning task:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

/**
 * @desc   Update task status (pending, in_progress / inprogress, completed)
 *         - Admin: can update status of any task
 *         - Employee: can ONLY update status of tasks assigned to them
 * @route  PATCH /api/tasks/:id/status
 * @access Admin and Employee (ownership verified for employees)
 */
export const updateTaskStatus = async (req, res) => {
    try {
        const taskId = parseInt(req.params.id, 10);
        if (isNaN(taskId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid task ID'
            });
        }

        const { status } = req.body;
        if (!status) {
            return res.status(400).json({
                success: false,
                message: 'Status is required'
            });
        }

        const parsedStatus = normalizeStatus(status);
        if (!parsedStatus) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Allowed values: ${VALID_STATUSES.join(', ')} (or inprogress)`
            });
        }

        const taskResult = await pool.query('SELECT * FROM tasks WHERE id = $1', [taskId]);
        if (taskResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        const task = taskResult.rows[0];

        // Authorization: Employee can only update tasks assigned to them
        if (req.user.role === 'employee' && task.assigned_to !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'You can only update the status of tasks assigned to you'
            });
        }

        await pool.query(
            `UPDATE tasks 
             SET status = $1, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $2`,
            [parsedStatus, taskId]
        );

        const updatedTask = await fetchTaskDetailsById(taskId);

        return res.status(200).json({
            success: true,
            message: 'Task status updated successfully',
            data: updatedTask
        });
    } catch (error) {
        console.error('Error updating task status:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

/**
 * @desc   Delete a task
 * @route  DELETE /api/tasks/:id
 * @access Admin only
 */
export const deleteTask = async (req, res) => {
    try {
        const taskId = parseInt(req.params.id, 10);
        if (isNaN(taskId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid task ID'
            });
        }

        const taskResult = await pool.query('SELECT id FROM tasks WHERE id = $1', [taskId]);
        if (taskResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        await pool.query('DELETE FROM tasks WHERE id = $1', [taskId]);

        return res.status(200).json({
            success: true,
            message: 'Task deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting task:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};
