import express from 'express'
import { createMessageController, messageHistoryController } from '../controller/message.controller.js'
import { authorize } from '../middleware/auth.middleware.js'
import { messageLimiter } from '../middleware/rateLimiter.middleware.js'

const router = express.Router()

router.get('/:roomId/messages', authorize, messageHistoryController)
router.post('/:roomId', authorize, messageLimiter, createMessageController)

export default router