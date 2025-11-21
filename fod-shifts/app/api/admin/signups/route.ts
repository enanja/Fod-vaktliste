/* eslint-disable @typescript-eslint/no-explicit-any */
export const runtime = "nodejs"
import { NextResponse } from 'next/server'
import { SignupStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { getShiftStartDate } from '@/lib/signups'

const prismaClient = prisma as any

type FilterOption = 'all' | 'upcoming' | 'past'

type SignupWithRelations = {
  id: number
  createdAt: Date
  shift: {
    id: number
    title: string
    type: 'MORGEN' | 'KVELD'
    date: Date
    startTime: string | null
    endTime: string | null
  }
  user: {
    id: number
    name: string
    email: string
  }
}

function parseFilter(value: string | null): FilterOption {
  if (value === 'all' || value === 'past') {
    return value
  }
  return 'upcoming'
}

function getShiftStart(shift: SignupWithRelations['shift']) {
  return getShiftStartDate({ date: shift.date, startTime: shift.startTime })
}

export async function GET(request: Request) {
  try {
    const session = await getSession()

    if (!session.isLoggedIn || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Ikke autorisert' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const filter = parseFilter(searchParams.get('filter'))

    const signups: SignupWithRelations[] = await prismaClient.signup.findMany({
      where: {
        status: SignupStatus.CONFIRMED,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        shift: {
          select: {
            id: true,
            title: true,
            type: true,
            date: true,
            startTime: true,
            endTime: true,
          },
        },
      },
    })

    const now = new Date()

    const filtered = signups.filter((signup) => {
      const shiftStart = getShiftStart(signup.shift)

      if (filter === 'past') {
        return shiftStart.getTime() < now.getTime()
      }

      if (filter === 'upcoming') {
        return shiftStart.getTime() >= now.getTime()
      }

      return true
    })

    filtered.sort((a, b) => {
      const startA = getShiftStart(a.shift).getTime()
      const startB = getShiftStart(b.shift).getTime()

      if (startA !== startB) {
        return startA - startB
      }

      const nameComparison = a.user.name.localeCompare(b.user.name, 'nb', {
        sensitivity: 'base',
      })

      if (nameComparison !== 0) {
        return nameComparison
      }

      return a.createdAt.getTime() - b.createdAt.getTime()
    })

    const payload = filtered.map((signup) => ({
      id: signup.id,
      createdAt: signup.createdAt,
      shift: {
        id: signup.shift.id,
        title: signup.shift.title,
        type: signup.shift.type,
        date: signup.shift.date,
        startTime: signup.shift.startTime,
        endTime: signup.shift.endTime,
      },
      user: {
        id: signup.user.id,
        name: signup.user.name,
        email: signup.user.email,
      },
    }))

    return NextResponse.json({ signups: payload })
  } catch (error) {
    console.error('Error fetching admin signups:', error)
    return NextResponse.json(
      { error: 'Kunne ikke hente påmeldinger.' },
      { status: 500 }
    )
  }
}
