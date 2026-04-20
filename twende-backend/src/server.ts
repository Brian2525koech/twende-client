// src/server.ts
import express from 'express'
import cors from 'cors'
import compression from 'compression'
import dotenv from 'dotenv'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { initIO } from './socket'

// ── Routes ────────────────────────────────────────────────────────────────────
import authRoutes             from './routes/authRoutes'
import routeRoutes            from './routes/routeRoutes'
import pingRoutes             from './routes/pingRoutes'
import favouriteRoutes        from './routes/favouriteRoutes'
import ratingRoutes           from './routes/ratingRoutes'
import adminRoutes            from './routes/adminRoutes'
import tripRoutes             from './routes/tripRoutes'
import notificationRoutes     from './routes/notificationRoutes'
import passengerRoutes        from './routes/passengerRoutes'
import driverRoutes           from './routes/driverRoutes'
import waitingRoutes          from './routes/waitingRoutes'
import matatuRoutes           from './routes/matatuRoutes'
import passengerProfileRoutes from './routes/passengerProfileRoutes'
import simRoutes from './routes/simulationRoutes'

dotenv.config()

const app        = express()
const httpServer = createServer(app)

// ── Middleware (order is critical) ────────────────────────────────────────────
//
// 1. CORS must come first so preflight OPTIONS requests are handled before
//    any body parsing or auth checks fire.
// 2. compression() shrinks JSON payloads 60-80% — huge win on slow Kenyan
//    networks. Must come before routes but after CORS.
// 3. express.json() only once, with the raised 10 mb limit.
//    The original file had a second app.use(express.json()) later which
//    silently overrode the limit back to Express's default 100 kb.

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }))
app.use(compression())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ limit: '10mb', extended: true }))

// ── Socket.IO ─────────────────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
})

initIO(io)

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'Twende backend is running', timestamp: new Date().toISOString() })
})

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',              authRoutes)
app.use('/api/routes',            routeRoutes)
app.use('/api/pings',             pingRoutes)
app.use('/api/favourites',        favouriteRoutes)
app.use('/api/ratings',           ratingRoutes)
app.use('/api/admin',             adminRoutes)
app.use('/api/trips',             tripRoutes)
app.use('/api/notifications',     notificationRoutes)
app.use('/api/passenger/profile', passengerProfileRoutes) 
app.use('/api/passenger',         passengerRoutes)
app.use('/api/driver',            driverRoutes)
app.use('/api/waiting',           waitingRoutes)
app.use('/api/matatu',            matatuRoutes)
app.use('/api/sim',               simRoutes)

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000
httpServer.listen(PORT, () => {
  console.log(`🚀 Twende server running on port ${PORT}`)
})