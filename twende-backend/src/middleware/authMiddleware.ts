// src/middleware/authMiddleware.ts
import { Response, NextFunction } from 'express'
import { verifyToken } from '../utils/jwt'
import { AuthRequest } from '../types'

export const requireAuth = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ message: 'No token provided' })
      return
    }

    const token = authHeader.split(' ')[1]
    const decoded = verifyToken(token)
    req.user = decoded
    next()
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired token' })
  }
}

export const requireDriver = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  requireAuth(req, res, () => {
    if (req.user?.role !== 'driver') {
      res.status(403).json({ message: 'Driver access required' })
      return
    }
    next()
  })
}

export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  requireAuth(req, res, () => {
    if (req.user?.role !== 'admin') {
      res.status(403).json({ message: 'Admin access required' })
      return
    }
    next()
  })
}