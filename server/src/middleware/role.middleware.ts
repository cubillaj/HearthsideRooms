import { Request, Response, NextFunction } from "express";
import { handleControllererror } from "../utils/handleErrorController.js";
export const authorizeRole = (roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            const userRole = (req as any).user?.role

            if (!roles.includes(userRole)) {
                return res.status(403).json({
                    message: 'Access denied'
                })
            }

            next()
        } catch(error) {
            return handleControllererror(res, error)
        }
    }
}