import express from 'express'
import { createMessageController, messageHistoryController } from '../controller/message.controller.js'
import { authorize } from '../middleware/auth.middleware.js'

const router = express.Router()

router.get('/:roomId/messages', authorize, messageHistoryController)
router.post('/:roomId', authorize, createMessageController)

export default router