/* eslint-disable @typescript-eslint/no-explicit-any */
export const runtime = "nodejs"
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { sendVolunteerInviteEmail, sendVolunteerApplicationRejectedEmail } from '@/lib/email'

const prismaClient = prisma as any // until Prisma client is regenerated

function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, '')
  }

  if (process.env.VERCEL_URL) {
    const url = process.env.VERCEL_URL
    if (url.startsWith('http')) {
      return url.replace(/\/$/, '')
    }
    return `https://${url.replace(/\/$/, '')}`
  }

  return 'http://localhost:3000'
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession()

    if (!session.isLoggedIn || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Ikke autorisert' }, { status: 403 })
    }

    const { id } = await context.params
    const applicationId = id

    const body = await request.json()
    const action: 'approve' | 'reject' = body.action

    if (!action) {
      return NextResponse.json({ error: 'Ugyldig forespørsel' }, { status: 400 })
    }

    const application = await prismaClient.volunteerApplication.findUnique({
      where: { id: applicationId },
    })

    if (!application) {
      return NextResponse.json({ error: 'Søknad ikke funnet' }, { status: 404 })
    }

    if (action === 'approve') {
      const updatedApplication = await prismaClient.volunteerApplication.update({
        where: { id: application.id },
        data: { status: 'approved' },
      })

      const registerUrl = `${getBaseUrl()}/register`

      await sendVolunteerInviteEmail({
        to: application.email,
        applicantName: application.name,
        registerUrl,
      })

      return NextResponse.json({
        application: {
          ...updatedApplication,
          invites: [],
        },
      })
    }

    if (action === 'reject') {
      const updatedApplication = await prismaClient.volunteerApplication.update({
        where: { id: application.id },
        data: { status: 'rejected' },
      })

      await sendVolunteerApplicationRejectedEmail({
        to: application.email,
        applicantName: application.name,
      })

      return NextResponse.json({ application: updatedApplication })
    }

    return NextResponse.json({ error: 'Ukjent handling' }, { status: 400 })
  } catch (error) {
    console.error('Error updating volunteer application:', error)
    return NextResponse.json(
      { error: 'Kunne ikke oppdatere søknaden.' },
      { status: 500 }
    )
  }
}
