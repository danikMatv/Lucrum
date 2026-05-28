import { SignJWT, jwtVerify } from 'jose'
import type { AuthUser, UserRole } from '../types'

export type TokenType = 'access' | 'refresh'

export interface JwtUserPayload extends AuthUser {
  tokenType: TokenType
}

interface VerifiedJwtPayload {
  sub?: string
  email?: string
  firstName?: string | null
  lastName?: string | null
  role?: UserRole
  tokenType?: TokenType
}

const getSecretKey = (secret: string) => new TextEncoder().encode(secret)

const signToken = async (user: AuthUser, secret: string, tokenType: TokenType, expiresIn: string) =>
  new SignJWT({
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    tokenType,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getSecretKey(secret))

export const signAccessToken = (user: AuthUser, secret: string) =>
  signToken(user, secret, 'access', '15m')

export const signRefreshToken = (user: AuthUser, secret: string) =>
  signToken(user, secret, 'refresh', '7d')

export const verifyJwt = async (
  token: string,
  secret: string,
  expectedTokenType?: TokenType,
): Promise<JwtUserPayload> => {
  const { payload } = await jwtVerify(token, getSecretKey(secret))
  const typedPayload = payload as VerifiedJwtPayload

  if (
    !typedPayload.sub ||
    !typedPayload.email ||
    !typedPayload.role ||
    !typedPayload.tokenType
  ) {
    throw new Error('Invalid token payload')
  }

  if (expectedTokenType && typedPayload.tokenType !== expectedTokenType) {
    throw new Error('Invalid token type')
  }

  return {
    id: typedPayload.sub,
    email: typedPayload.email,
    firstName: typedPayload.firstName ?? null,
    lastName: typedPayload.lastName ?? null,
    role: typedPayload.role,
    tokenType: typedPayload.tokenType,
  }
}
