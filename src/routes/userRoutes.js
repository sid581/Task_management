import express from 'express'
import { getUsers,getUserById,  updateUserByName, getProfile, getAdminDashboard } from '../controllers/usercontroller.js'
import authenticateUser from '../middleware/authMiddleware.js'
import authorizeRole from '../middleware/authorizeRole.js'
const router=express.Router()


router.get('/',getUsers)
router.get('/me',authenticateUser,getProfile)

router.get('/:id',getUserById)
router.get('/admin/dashboard',authenticateUser,authorizeRole('admin'),getAdminDashboard)

// router.post('/',createUser)

router.put('/:id',updateUserByName)

export default router;
