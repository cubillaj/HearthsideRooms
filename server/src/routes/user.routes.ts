import express from 'express'
import { userProfileController, changeMyPasswordController, updateProfileController, updateMyInfoController, createAccountByAdminController, getAllUserController, getUserController, updateUserController, deleteUserController, getProfileController } from '../controller/user.controller.js'
import { authorize } from '../middleware/auth.middleware.js'
import { authorizeRole } from '../middleware/role.middleware.js'
import { upload } from '../middleware/upload.middleware.js'
import { changePasswordRateLimiter, createAccountRateLimiter, readRateLimiter, updateInfoRateLimiter, updateProfileRateLimiter } from '../middleware/rateLimiter.middleware.js'
const router = express.Router()

router.get('/', authorize, authorizeRole(['super_admin']), readRateLimiter, getAllUserController)

router.get('/profile-user', authorize, readRateLimiter, getProfileController)
router.get('/profile', authorize, readRateLimiter, userProfileController)

router.post('/create-account', authorize, authorizeRole(['super_admin']), createAccountRateLimiter, createAccountByAdminController)

router.put('/update-info', authorize, updateInfoRateLimiter, updateMyInfoController)
router.put('/update-profile', authorize, updateProfileRateLimiter, upload.single('profileImage'), updateProfileController)
router.put('/change-password', authorize, changePasswordRateLimiter, changeMyPasswordController)

router.get('/:id', authorize, authorizeRole(['super_admin']), readRateLimiter, getUserController)
router.put('/:id', authorize, authorizeRole(['super_admin']), updateUserController)
router.delete('/:id', authorize, authorizeRole(['super_admin']), deleteUserController)

export default router
