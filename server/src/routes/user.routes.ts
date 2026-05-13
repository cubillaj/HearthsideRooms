import express from 'express'
import { userProfileController, changeMyPasswordController, updateProfileController, updateMyInfoController, createAccountByAdminController, getAllUserController, getUserController, updateUserController, deleteUserController, getProfileController } from '../controller/user.controller.js'
import { authorize } from '../middleware/auth.middleware.js'
import { authorizeRole } from '../middleware/role.middleware.js'
import { upload } from '../middleware/upload.middleware.js'
const router = express.Router()

router.get('/', authorize, authorizeRole(['super_admin']), getAllUserController)

router.get('/profile-user', authorize, getProfileController)
router.get('/profile', authorize, userProfileController)

router.post('/create-account', authorize, authorizeRole(['super_admin']), createAccountByAdminController)

router.put('/update-info', authorize, updateMyInfoController)
router.put('/update-profile', authorize, upload.single('profileImage'), updateProfileController)
router.put('/change-password', authorize, changeMyPasswordController)

router.get('/:id', authorize, authorizeRole(['super_admin']), getUserController)
router.put('/:id', authorize, authorizeRole(['super_admin']), updateUserController)
router.delete('/:id', authorize, authorizeRole(['super_admin']), deleteUserController)

export default router
