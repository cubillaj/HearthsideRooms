import { Request, Response, NextFunction } from "express"
import * as AuthService from '../services/auth.services.js'
import { handleControllererror } from "../utils/handleErrorController.js"
import { AppError } from "../utils/appError.js"

export const authorize = async (req: Request & { user?: any }, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                message: 'Unauthorized'
            })
        }

        const token: any= authHeader?.split(' ')[1]
        const decoded = AuthService.verifyToken(token)

        const user = await AuthService.getUserById(decoded.userId)

        req.user = user
     
        next()
    } catch (error) {
        if (error instanceof Error && ['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'].includes(error.name)) {
            return res.status(401).json({
                message: 'Unauthorized'
            })
        }

        if (error instanceof AppError && error.message === 'User not found') {
            return res.status(401).json({
                message: 'Unauthorized'
            })
        }

        return handleControllererror(res, error)
    }
}   
