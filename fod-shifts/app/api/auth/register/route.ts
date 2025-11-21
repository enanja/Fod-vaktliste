export const runtime = "nodejs"
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcrypt'

const prismaClient = prisma as any

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { valid: false, error: 'Invitasjonstoken mangler.' },
        { status: 400 }
      )
    }

    const invite = await prismaClient.inviteToken.findUnique({
      where: { token },
      include: {
        applicant: true,
      },
    })

    if (!invite) {
      return NextResponse.json(
        { valid: false, error: 'Denne registreringslenken er ugyldig.' },
        { status: 404 }
      )
    }

    if (invite.usedAt) {
      return NextResponse.json(
        { valid: false, error: 'Denne registreringslenken er allerede brukt.' },
        { status: 410 }
      )
    }

    if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) {
      return NextResponse.json(
        { valid: false, error: 'Registreringslenken er utløpt. Be om en ny invitasjon.' },
        { status: 410 }
      )
    }

    return NextResponse.json({
      valid: true,
      invite: {
        email: invite.email,
        applicantName: invite.applicant?.name ?? null,
        expiresAt: invite.expiresAt?.toISOString() ?? null,
      },
    })
  } catch (error) {
    console.error('Invite validation error:', error)
    return NextResponse.json(
      { valid: false, error: 'Kunne ikke validere invitasjonen.' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const { name, password, token } = await request.json()

    if (!name || !password || !token) {
      return NextResponse.json(
        { error: 'Navn, passord og invitasjonstoken er påkrevd.' },
        { status: 400 }
      )
    }

    const invite = await prismaClient.inviteToken.findUnique({
      where: { token },
      include: {
        applicant: true,
      },
    })

    if (!invite) {
      return NextResponse.json(
        { error: 'Invitasjonen finnes ikke eller er ugyldig.' },
        { status: 404 }
      )
    }

    if (invite.usedAt) {
      return NextResponse.json(
        { error: 'Denne invitasjonen er allerede brukt.' },
        { status: 410 }
      )
    }

    if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) {
      return NextResponse.json(
        { error: 'Invitasjonen er utløpt. Kontakt FOD for en ny lenke.' },
        { status: 410 }
      )
    }

    const inviteEmail = invite.email.trim().toLowerCase()

    const existingUser = await prismaClient.user.findUnique({
      where: { email: inviteEmail },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Det finnes allerede en bruker med denne e-posten.' },
        { status: 409 }
      )
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prismaClient.user.create({
      data: {
        name: name || invite.applicant?.name || inviteEmail.split('@')[0],
        email: inviteEmail,
        hashedPassword,
        role: 'FRIVILLIG',
        status: 'active',
        isBlocked: false,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
      },
    })

    await prismaClient.inviteToken.update({
      where: { id: invite.id },
      data: {
        usedAt: new Date(),
      },
    })

    if (invite.applicantId) {
      try {
        await prismaClient.volunteerApplication.update({
          where: { id: invite.applicantId },
          data: { status: 'completed' },
        })
      } catch (updateError) {
        console.warn('Kunne ikke oppdatere søknadsstatus:', updateError)
      }
    }

    return NextResponse.json({
      message: 'Bruker opprettet',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    })
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json(
      { error: 'Noe gikk galt ved registrering' },
      { status: 500 }
    )
  }
}
