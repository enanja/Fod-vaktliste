/* eslint-disable @typescript-eslint/no-explicit-any */
export const runtime = "nodejs"
import { NextResponse } from 'next/server'
import { SignupStatus } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { getShiftStartDate } from '@/lib/signups'

const prismaClient = prisma as any

type FilterOption = 'all' | 'upcoming' | 'past'
type ViewOption = 'signups' | 'waitlist'

type ShiftSummary = {
  id: number
  title: string
  type: 'MORGEN' | 'KVELD'
  date: Date
  startTime: string | null
  endTime: string | null
}

type UserSummary = {
  id: number
  name: string
  email: string
}

type SignupWithRelations = {
  id: number
  createdAt: Date
  shift: ShiftSummary
  user: UserSummary
}

type WaitlistWithRelations = {
  id: number
  createdAt: Date
  shift: ShiftSummary
  user: UserSummary
}

function parseFilter(value: string | null): FilterOption {
  if (value === 'all' || value === 'past') {
    return value
  }
  return 'upcoming'
}

function parseView(value: string | null): ViewOption {
  return value === 'waitlist' ? 'waitlist' : 'signups'
}

function getShiftStart(shift: SignupWithRelations['shift']) {
  return getShiftStartDate({ date: shift.date, startTime: shift.startTime })
}

function applyFilter<T extends { shift: ShiftSummary }>(entries: T[], filter: FilterOption, now: Date) {
  return entries.filter((entry) => {
    const shiftStart = getShiftStart(entry.shift)

    if (filter === 'past') {
      return shiftStart.getTime() < now.getTime()
    }

    if (filter === 'upcoming') {
      return shiftStart.getTime() >= now.getTime()
    }

    return true
  })
}

function sortEntries<T extends { shift: ShiftSummary; user: UserSummary; createdAt: Date }>(entries: T[]) {
  return entries.sort((a, b) => {
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
}

export async function GET(request: Request) {
  try {
    const session = await getSession()

    if (!session.isLoggedIn || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Ikke autorisert' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const filter = parseFilter(searchParams.get('filter'))
    const view = parseView(searchParams.get('view'))

    const now = new Date()

    if (view === 'waitlist') {
      const waitlistEntries: WaitlistWithRelations[] = await prismaClient.waitlistEntry.findMany({
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

      const filteredWaitlist = applyFilter(waitlistEntries, filter, now)
      const sortedWaitlist = sortEntries(filteredWaitlist)

      const payload = sortedWaitlist.map((entry) => ({
        id: entry.id,
        createdAt: entry.createdAt,
        shift: {
          id: entry.shift.id,
          title: entry.shift.title,
          type: entry.shift.type,
          date: entry.shift.date,
          startTime: entry.shift.startTime,
          endTime: entry.shift.endTime,
        },
        user: {
          id: entry.user.id,
          name: entry.user.name,
          email: entry.user.email,
        },
      }))

      return NextResponse.json({ waitlist: payload })
    }

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

    const filteredSignups = applyFilter(signups, filter, now)
    const sortedSignups = sortEntries(filteredSignups)

    const payload = sortedSignups.map((signup) => ({
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
