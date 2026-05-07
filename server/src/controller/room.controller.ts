import * as RoomServices from '../services/room.services.js'
import { Request, Response } from 'express'
import { handleControllererror } from '../utils/handleErrorController.js'

export const createRoomController = async (req: Request, res: Response) => {
    try {
        const { roomName, roomPassword } = req.body

        const userId = req.user?.id

        if (!userId) return res.status(400).json('Unauthorized')

        const room = await RoomServices.createRoom(userId, {
            roomName,
            roomPassword
        })

        return res.status(201).json({
            message: 'Successfully created a room!',
            room
        })
    } catch (error) {
        return handleControllererror(res, error)
    }
}

export const joinRoomController = async (req: Request, res: Response) => {
    try {

        const userId = req.user?.id

        if (!userId) {
            return res.status(403).json({
                message: 'Unauthorized'
            })
        }

        const roomId = Number(req.params.roomId)

        if (!roomId) return res.status(400).json({ message: 'Room id is required'})
        
        const room = await RoomServices.joinRoom(userId, roomId, req.body)

        return res.status(200).json({
            message: `Welcome to ${room.roomName}`
        })
    } catch (error) {
        return handleControllererror(res, error)
    }
}

export const getMyRoomsController = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id

        if (!userId) {
            return res.status(403).json({
                message: 'Unauthorized'
            })
        }

        const rooms = await RoomServices.getMyRoom(userId)

        return res.status(200).json({
            rooms
        })
    } catch (error) {
        return handleControllererror(res, error)
    }
}

export const getAllRoomsController = async (req: Request, res: Response) => {
    try {
        const rooms = await RoomServices.getAllRooms()

        return res.status(200).json({
            rooms
        })
    } catch (error) {
        return handleControllererror(res, error)
    }
}
