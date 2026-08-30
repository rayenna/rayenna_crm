import jwt from 'jsonwebtoken'
import type { UserRole } from '@prisma/client'

export type StaffJwtUser = {
  id: string
  email: string
  role: UserRole
  tokenVersion: number
}

export function signStaffJwt(user: StaffJwtUser): string {
  const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret || jwtSecret.trim() === '') {
    throw new Error('JWT_SECRET is not set')
  }
  const expiresIn: string = process.env.JWT_EXPIRES_IN || '7d'
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    tokenVersion: user.tokenVersion,
  }
  return (jwt.sign as (payload: object, secret: string, options: object) => string)(payload, jwtSecret, {
    expiresIn,
  })
}
