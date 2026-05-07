import { Response } from "express"
import { AppError } from "./appError.js"

export const handleControllererror = (res: Response, error: unknown) => {
    if (error instanceof AppError){
        return res.status(error.statusCode).json({
            message: error.message
        })
    }

    return res.status(500).json({
        message: 'Internal server error'
    })
}