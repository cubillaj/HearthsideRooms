import express from 'express'
import {refresh, logout, loginController, registerController} from '../controller/auth.controller.js'
import { authRateLimiter, registerRateLimiter } from '../middleware/rateLimiter.middleware.js'
const router = express.Router()

router.post('/register',registerRateLimiter, registerController)
router.post('/login', authRateLimiter, loginController)
router.post('/refresh', refresh)
router.post('/logout', logout)

export default router
