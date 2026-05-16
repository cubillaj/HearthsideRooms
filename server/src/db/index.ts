import 'dotenv/config'
import { Pool } from '@neondatabase/serverless'
import {drizzle } from 'drizzle-orm/node-postgres'
import * as schema from './schema.js'

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    idleTimeoutMillis: 60000,
    max: 5
})

pool.on('error', (err: any) => {
    console.error('Unexpected database pool error', err)
})

export const db = drizzle(pool, { schema })
