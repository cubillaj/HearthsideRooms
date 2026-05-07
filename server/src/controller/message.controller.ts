import type { Request, Response } from 'express'
import { handleControllererror } from '../utils/handleErrorController.js'
import * as MessageService from '../services/message.service.js'
import { getIo } from '../socket/socket.js'
export const createMessageController = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id

        if (!userId) return res.status(403).json({
            message: 'Unauthorized'
        })

        const roomId = Number(req.params.roomId)

        if (!roomId) {
            return res.status(400).json({ message: 'Room id is required'})
        }

        const newMessage = await MessageService.createMessage( userId, roomId, req.body)

        getIo().to(roomId.toString()).emit('receive_message', newMessage)
        
        return res.status(201).json({
            newMessage
        })
        
    } catch (error) {
        return handleControllererror(res, error)
    }
}

export const messageHistoryController = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id

        if (!userId) return res.status(400).json({
            message: 'Unauthorized'
        })

        const roomId = Number(req.params.roomId)

        if (!roomId) return res.status(400).json({ message: 'room id is required'})

        const messages = await MessageService.getMessageHistory(userId, roomId)

        return res.status(200).json({
            messages
        })
    } catch (error) {
        return handleControllererror(res, error)
    }
}
