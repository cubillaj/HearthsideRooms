import express from 'express'
import { createRoomController, deleteRoomAdminController, getAllRoomsController, getAllRoomsForAdminController, getMyRoomsController, getSingleRoomController, joinRoomController } from '../controller/room.controller.js'
import { authorize } from '../middleware/auth.middleware.js'
import { authorizeRole } from '../middleware/role.middleware.js'
import { createRoomLimiter, joinRoomRateLimiter, readRateLimiter } from '../middleware/rateLimiter.middleware.js'

const router = express.Router()

router.get('/', authorize, readRateLimiter, getAllRoomsController)
router.get('/admin', authorize, authorizeRole(['super_admin']), readRateLimiter, getAllRoomsForAdminController)
router.get('/my', authorize, readRateLimiter, getMyRoomsController)
router.get('/:id', authorize, authorizeRole(['super_admin']), readRateLimiter, getSingleRoomController)
router.delete('/:id', authorize, authorizeRole(['super_admin']), deleteRoomAdminController)
router.post('/', authorize, createRoomLimiter, createRoomController)
router.post('/:roomId/join', authorize, joinRoomRateLimiter, joinRoomController)

export default router
