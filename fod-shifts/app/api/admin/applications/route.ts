/* eslint-disable @typescript-eslint/no-explicit-any */
export const runtime = "nodejs"
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

const prismaClient = prisma as any

export async function GET() {
  try {
    const session = await getSession()

    if (!session.isLoggedIn || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Ikke autorisert' }, { status: 403 })
    }

    const applications = await prismaClient.volunteerApplication.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        invites: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })

    return NextResponse.json({ applications })
  } catch (error) {
    console.error('Error fetching volunteer applications:', error)
    return NextResponse.json(
      { error: 'Kunne ikke hente søknader.' },
      { status: 500 }
    )
  }
}
