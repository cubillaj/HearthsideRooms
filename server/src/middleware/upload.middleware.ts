import { v2 as cloudinary, type UploadApiOptions, type UploadApiResponse } from 'cloudinary'
import dotenv from 'dotenv'
import multer from 'multer'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { AppError } from '../utils/appError.js'

const envPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.env')
dotenv.config({ path: envPath })

const cloudinaryConfig = {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
}

cloudinary.config(cloudinaryConfig)

const allowedImageFormats = ['jpg', 'jpeg', 'png', 'webp'] as const
const allowedImageMimeTypes = new Set([
    'image/jpeg',
    'image/png',
    'image/webp'
])

export const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024
    },
    fileFilter: (_req, file, cb) => {
        if (!allowedImageMimeTypes.has(file.mimetype)) {
            cb(new AppError('Only JPG, PNG, and WEBP images are allowed', 400))
            return
        }

        cb(null, true)
    }
})

export const uploadImageToCloudinary = (
    file: Express.Multer.File,
    options: UploadApiOptions = {}
): Promise<UploadApiResponse> => {
    if (!cloudinaryConfig.cloud_name || !cloudinaryConfig.api_key || !cloudinaryConfig.api_secret) {
        throw new AppError('Cloudinary is not configured correctly', 500)
    }

    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                resource_type: 'image',
                allowed_formats: [...allowedImageFormats],
                ...options
            },
            (error, result) => {
                if (error) {
                    reject(error)
                    return
                }

                if (!result) {
                    reject(new AppError('Cloudinary upload failed', 500))
                    return
                }

                resolve(result)
            }
        )

        stream.end(file.buffer)
    })
}

export { cloudinary }
