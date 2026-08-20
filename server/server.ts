import express from 'express'
import http from "http"
import { initSocket } from './src/socket/socket.js'
import cors from 'cors'
import authRouter from './src/routes/auth.routes.js'
import userRouter from './src/routes/user.routes.js'
import roomRouter from './src/routes/room.routes.js'
import messageRouter from './src/routes/message.routes.js'
import cookieParser from 'cookie-parser'
import { errorMiddleware } from './src/middleware/error.middleware.js'
import helmet from 'helmet'
import morgan from 'morgan'
import { connectRedis } from './src/redis/redis.js'
const app = express()
// Trust no forwarded address by default. Set this to the exact proxy-hop count.
app.set('trust proxy', process.env.TRUST_PROXY_HOPS ? Number(process.env.TRUST_PROXY_HOPS) : false)
const devOrigins = ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174']

app.use(helmet())
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))
app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? process.env.CLIENT_URL : devOrigins,
    credentials: true
}))
app.use(express.json())
app.use(cookieParser())

const server = http.createServer(app)
const PORT = process.env.PORT || 3000

initSocket(server)

app.use('/api/auth', authRouter)
app.use('/api/users', userRouter)
app.use('/api/rooms', roomRouter)
app.use('/api/messages', messageRouter)
app.use(errorMiddleware)

async function startServer() {
    await connectRedis()

    server.listen(PORT, () => {
        console.log(`Server started on port ${PORT}`)
    })
}

startServer().catch((error) => {
    console.error('Failed to start server', error)
    process.exit(1)
})
