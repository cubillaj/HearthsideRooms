import { Request, Response } from "express"
import * as AuthService from '../services/auth.services.js'
import { handleControllererror } from "../utils/handleErrorController.js"

export const REFRESH_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' as const : 'strict' as const,
    maxAge: 1 * 24 * 60 * 60 * 1000,
    path: '/api/auth',
} 

export const registerController = async (req: Request, res: Response) => {
    try {

        const user = await AuthService.register(req.body)
        const token = await AuthService.signToken(user.id)
        const refreshToken = await AuthService.createRefreshToken(user.id)

        res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS)

        return res.status(201).json({
            message: 'User registered successfuclly',
            user,
            token
        })
    } catch (error){
        return handleControllererror(res, error)
    }
}

export const loginController = async (req: Request, res: Response ) => {
    try {
        const user = await AuthService.login(req.body)
        const refreshToken = await AuthService.createRefreshToken(user.user.id)

        res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS)

        return res.status(200).json({
            user: user.user,
            token: user.token
        })
    } catch (error) {
        return handleControllererror(res, error)
    }
}

export const refresh = async (req: Request, res: Response) => {
    try {
        const token = req.cookies.refreshToken

        if (!token) return res.status(400).json({ message: 'No token provided'})
        
        // rotate old token deleted, new one created
        const { userId, newToken } = await AuthService.rotateRefreshToken(token)

        const accessToken = await AuthService.signToken(userId)
        const user = await AuthService.getUserById(userId)

        res.cookie('refreshToken', newToken, REFRESH_COOKIE_OPTIONS)
        return res.status(200).json({
            token: accessToken,
            user
        })
    } catch (error) {
        // clear bad cookie
        res.clearCookie('refreshToken', { path: '/api/auth'})
        return handleControllererror(res, error)
    }
}

export const logout = async (req: Request, res: Response) => {
    try {
        const token = req.cookies.refreshToken

        if (token) {
            await AuthService.revokeRefreshToken(token)
        } else { 
            return res.status(400).json({ message: 'No token provided'})
        }
        
        res.clearCookie('refreshToken', { path: '/api/auth'})

        return res.status(200).json({
            message: 'Logged out'
        })
    } catch (error) {
        return handleControllererror(res, error)
    }
}
