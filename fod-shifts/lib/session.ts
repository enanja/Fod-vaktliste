import { getIronSession, IronSession, SessionOptions } from 'iron-session'
import { cookies } from 'next/headers'

export interface SessionData {
  userId: number
  email: string
  name: string
  role: 'ADMIN' | 'FRIVILLIG'
  isLoggedIn: boolean
}

export const defaultSession: SessionData = {
  userId: 0,
  email: '',
  name: '',
  role: 'FRIVILLIG',
  isLoggedIn: false,
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET || 'complex_password_at_least_32_characters_long_for_security',
  cookieName: 'fod-session',
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7, // 1 uke
  },
}

export async function getSession(): Promise<IronSession<SessionData>> {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions)
  
  if (!session.isLoggedIn) {
    Object.assign(session, defaultSession)
  }
  
  return session
}
