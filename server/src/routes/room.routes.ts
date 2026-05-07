import express from 'express'
import { createRoomController, getAllRoomsController, getMyRoomsController, joinRoomController } from '../controller/room.controller.js'
import { authorize } from '../middleware/auth.middleware.js'

const router = express.Router()

router.get('/', authorize, getAllRoomsController)
router.get('/my', authorize, getMyRoomsController)
router.post('/', authorize, createRoomController)
router.post('/:roomId/join', authorize, joinRoomController)

export default router
