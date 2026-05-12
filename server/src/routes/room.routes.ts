import express from 'express'
import { createRoomController, deleteRoomAdminController, getAllRoomsController, getAllRoomsForAdminController, getMyRoomsController, getSingleRoomController, joinRoomController } from '../controller/room.controller.js'
import { authorize } from '../middleware/auth.middleware.js'
import { authorizeRole } from '../middleware/role.middleware.js'

const router = express.Router()

router.get('/', authorize, getAllRoomsController)
router.get('/admin', authorize, authorizeRole(['super_admin']), getAllRoomsForAdminController)
router.get('/my', authorize, getMyRoomsController)
router.get('/:id', authorize, authorizeRole(['super_admin']), getSingleRoomController)
router.delete('/:id', authorize, authorizeRole(['super_admin']), deleteRoomAdminController)
router.post('/', authorize, createRoomController)
router.post('/:roomId/join', authorize, joinRoomController)

export default router
