import { Request, Response, NextFunction } from "express";
import { handleControllererror } from "../utils/handleErrorController.js";
import * as UserService from '../services/users.services.js'

export const userProfileController = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id

        if (!userId) return res.status(401).json({ message: "Unauthorized"})
        
        const user = await UserService.userProfile(userId)

        return res.status(200).json({
            user
        })
    } catch (error) {
        return handleControllererror(res, error)
    }
}

export const updateMyProfileController = async (req: Request, res: Response) => {
    try {
        const { name, middleName, username, lastName} = req.body

        const userId = req.user?.id

        if (!userId) return res.status(401).json({ message: 'Unauthorized'})
            
        const updatedUserProfile = await UserService.updateMyProfile(userId, {
            username,
            name,
            middleName,
            lastName
        })

        return res.status(200).json({
            user: updatedUserProfile
        })

    } catch (error) {
        return handleControllererror(res, error)
    }
}

export const changeMyPasswordController = async (req: Request, res: Response) => {
    try {
        const { newPassword, currentPassword} = req.body

        const userId = req.user?.id

        if (!userId) return res.status(401).json({message: 'Unauthorized'})

        await UserService.changeMyPassword(userId, {
            password: newPassword,
            currentPassword
        })

        return res.status(200).json({
            message: 'Successfully changed password'
        })
    } catch (error) {
        return handleControllererror(res, error)
    }
}   

export const createAccountByAdminController = async (req: Request, res: Response) => {
    try {
        const user = await UserService.createAccountByAdmin(req.body)

        return res.status(201).json({
            message: 'User registered successfuclly',
            user
        })
    } catch (error){
        return handleControllererror(res, error)
    }
}

export const getAllUserController = async (req: Request, res: Response) => {
    try {
        const users = await UserService.getAllUsers(req.query)

        return res.status(200).json({
            users
        })
    } catch (error) {
        return handleControllererror(res, error)
    }
}

export const getUserController = async (req: Request, res: Response) => {
    try {
    const userId = Number(req.params.id)

    if (!Number.isInteger(userId) || userId <= 0) return res.status(400).json({
        message: 'Id is required'
    })

    const user = await UserService.getUser(userId)

    return res.status(200).json({
        user
    })
   } catch (error) {
    return handleControllererror(res, error)
   }
}

export const updateUserController = async (req: Request, res: Response) => {
    try {
    const userId = Number(req.params.id)

    if (!Number.isInteger(userId) || userId <= 0) return res.status(400).json({ message: 'Id is required'})

    const user = await UserService.updateUser(userId, req.body)

    return res.status(200).json({
        user
    })
    } catch (error) {
        return handleControllererror(res, error)
    }
}

export const deleteUserController = async (req: Request, res: Response) => {
    try {
        const userId = Number(req.params.id)

        if (!Number.isInteger(userId) || userId <= 0) return res.status(400).json({
            message: 'User id is required'
        })

        await UserService.deleteUser(userId)

        return res.status(200).json({
            message: 'Successfully deleted user!'
        })
    } catch(error) {
        return handleControllererror(res, error)
    }
}
