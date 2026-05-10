import express from 'express'
import { userProfileController, changeMyPasswordController, updateMyProfileController, createAccountByAdminController, getAllUserController, getUserController, updateUserController, deleteUserController } from '../controller/user.controller.js'
import { authorize } from '../middleware/auth.middleware.js'
import { authorizeRole } from '../middleware/role.middleware.js'
const router = express.Router()

router.get('/', authorize, authorizeRole(['super_admin']), getAllUserController)
router.get('/profile', authorize, userProfileController)
router.get('/:id', authorize, authorizeRole(['super_admin']), getUserController)
router.put('/:id', authorize, authorizeRole(['super_admin']), updateUserController)
router.delete('/:id', authorize, authorizeRole(['super_admin']), deleteUserController)
router.post('/create-account',  authorize, authorizeRole(['super_admin']), createAccountByAdminController)
router.patch('/update-profile', authorize, updateMyProfileController)
router.patch('/change-password', authorize, changeMyPasswordController)

export default router
