import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'

dotenv.config()

const JWT_SECRET = process.env.JWT_SECRET as string
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

export const signToken = (payload: {
  id: number
  email: string
  role: string
}): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions)
}

export const verifyToken = (token: string): {
  id: number
  email: string
  role: string
} => {
  return jwt.verify(token, JWT_SECRET) as {
    id: number
    email: string
    role: string
  }
}