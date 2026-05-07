import { Request, Response, NextFunction } from "express"
import * as AuthService from '../services/auth.services.js'
import { handleControllererror } from "../utils/handleErrorController.js"

export const authorize = async (req: Request & { user?: any }, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(400).json({
                message: 'No token provided'
            })
        }

        const token: any= authHeader?.split(' ')[1]
        const decoded = AuthService.verifyToken(token)

        const user = await AuthService.getUserById(decoded.userId)

        if (!user) {
            return res.status(404).json({
                message: 'User not found'
            })
        }

        req.user = user
     
        next()
    } catch (error) {
        return handleControllererror(res, error)
    }
}   