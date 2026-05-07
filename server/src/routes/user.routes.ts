import express from 'express'
import { userProfileController, changeMyPasswordController, updateMyProfileController, createAccountByAdminController } from '../controller/user.controller.js'
import { authorize } from '../middleware/auth.middleware.js'
import { authorizeRole } from '../middleware/role.middleware.js'
const router = express.Router()

router.get('/profile', authorize, userProfileController)
router.post('/create-account',  authorize, authorizeRole(['super_admin']), createAccountByAdminController)
router.patch('/update-profile', authorize, updateMyProfileController)
router.patch('/change-password', authorize, changeMyPasswordController)

export default router