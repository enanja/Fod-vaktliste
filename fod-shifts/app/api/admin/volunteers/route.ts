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

    const volunteers = await prismaClient.user.findMany({
      where: { role: 'FRIVILLIG' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        isBlocked: true,
        blockedAt: true,
        blockedReason: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ volunteers })
  } catch (error) {
    console.error('Error fetching volunteers:', error)
    return NextResponse.json(
      { error: 'Kunne ikke hente frivillige.' },
      { status: 500 }
    )
  }
}
