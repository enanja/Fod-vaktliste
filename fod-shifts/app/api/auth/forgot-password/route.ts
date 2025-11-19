import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendPasswordResetEmail } from '@/lib/email'
import crypto from 'crypto'

const RESET_TOKEN_EXPIRATION_MINUTES = 60

function getBaseUrl() {
  const baseUrl = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL
  if (baseUrl) {
    return baseUrl.replace(/\/$/, '')
  }
  return 'http://localhost:3000'
}

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Epost er påkrevd' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({ where: { email } })

    // Returner uansett for å hindre kontoenumerering
    if (!user) {
      return NextResponse.json({
        message: 'Hvis eposten finnes hos oss, sender vi en lenke for å tilbakestille passordet ditt.',
      })
    }

    // Slett gamle tokens
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } })

    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRATION_MINUTES * 60 * 1000)

    await prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    })

    const resetUrl = `${getBaseUrl()}/reset-password?token=${token}`

    await sendPasswordResetEmail({
      to: user.email,
      userName: user.name,
      resetUrl,
    })

    return NextResponse.json({
      message: 'Hvis eposten finnes hos oss, sender vi en lenke for å tilbakestille passordet ditt.',
    })
  } catch (error) {
    console.error('Error handling forgot password:', error)
    return NextResponse.json(
      { error: 'Kunne ikke behandle forespørselen' },
      { status: 500 }
    )
  }
}
