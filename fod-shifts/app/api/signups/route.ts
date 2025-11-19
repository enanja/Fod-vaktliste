import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

// POST - Meld seg på et skift
export async function POST(request: Request) {
  try {
    const session = await getSession()

    if (!session.isLoggedIn) {
      return NextResponse.json(
        { error: 'Du må være logget inn for å melde deg på' },
        { status: 401 }
      )
    }

    const { shiftId, comment } = await request.json()

    if (!shiftId) {
      return NextResponse.json(
        { error: 'Skift-ID er påkrevd' },
        { status: 400 }
      )
    }

    // Hent skiftet med påmeldinger
    const shift = await prisma.shift.findUnique({
      where: { id: parseInt(shiftId) },
      include: {
        signups: true,
      },
    })

    if (!shift) {
      return NextResponse.json(
        { error: 'Skift ikke funnet' },
        { status: 404 }
      )
    }

    // Sjekk om skiftet er fullt
    if (shift.signups.length >= shift.maxVolunteers) {
      return NextResponse.json(
        { error: 'Dette skiftet er dessverre fullt' },
        { status: 400 }
      )
    }

    // Sjekk om brukeren allerede er påmeldt
    const existingSignup = await prisma.signup.findFirst({
      where: {
        shiftId: parseInt(shiftId),
        userId: session.userId,
      },
    })

    if (existingSignup) {
      return NextResponse.json(
        { error: 'Du er allerede påmeldt dette skiftet' },
        { status: 400 }
      )
    }

    // Opprett påmelding
    const signup = await prisma.signup.create({
      data: {
        shiftId: parseInt(shiftId),
        userId: session.userId,
        comment: comment || null,
      },
      include: {
        shift: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    })

    // Send epost-notifikasjon til admin (simulert)
    await sendAdminNotificationEmail({
      volunteerName: signup.user.name,
      volunteerEmail: signup.user.email,
      shiftTitle: signup.shift.title,
      shiftDate: signup.shift.date,
      comment: signup.comment || 'Ingen kommentar',
    })

    return NextResponse.json(
      { message: 'Påmelding vellykket', signup },
      { status: 201 }
    )
  } catch (error: unknown) {
    // Sjekk om det er en Prisma unique constraint error
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Du er allerede påmeldt dette skiftet' },
        { status: 400 }
      )
    }

    console.error('Error creating signup:', error)
    return NextResponse.json(
      { error: 'Kunne ikke opprette påmelding' },
      { status: 500 }
    )
  }
}

// GET - Hent brukerens egne påmeldinger
export async function GET() {
  try {
    const session = await getSession()

    if (!session.isLoggedIn) {
      return NextResponse.json(
        { error: 'Du må være logget inn' },
        { status: 401 }
      )
    }

    const signups = await prisma.signup.findMany({
      where: {
        userId: session.userId,
      },
      include: {
        shift: true,
      },
      orderBy: {
        shift: {
          date: 'asc',
        },
      },
    })

    return NextResponse.json(signups)
  } catch (error) {
    console.error('Error fetching signups:', error)
    return NextResponse.json(
      { error: 'Kunne ikke hente påmeldinger' },
      { status: 500 }
    )
  }
}

// Epost-funksjon (ekte sending eller simulert)
async function sendAdminNotificationEmail(data: {
  volunteerName: string
  volunteerEmail: string
  shiftTitle: string
  shiftDate: Date
  comment: string
}) {
  const enableEmail = process.env.ENABLE_EMAIL === 'true'
  
  // Alltid log til konsollen
  console.log('📧 === EPOST TIL ADMIN ===')
  console.log('Til:', process.env.ADMIN_EMAIL || 'admin@fod.local')
  console.log('Emne: Ny påmelding til skift')
  console.log('---')
  console.log(`En frivillig har meldt seg på et skift!`)
  console.log('')
  console.log(`Frivillig: ${data.volunteerName}`)
  console.log(`Epost: ${data.volunteerEmail}`)
  console.log(`Skift: ${data.shiftTitle}`)
  console.log(`Dato: ${data.shiftDate.toLocaleDateString('no-NO')}`)
  console.log(`Kommentar: ${data.comment}`)
  console.log('=========================')
  
  // Send ekte epost hvis aktivert
  if (enableEmail) {
    try {
      const nodemailer = require('nodemailer')
      
      // Opprett transporter med SMTP-innstillinger
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false, // true for 465, false for andre porter
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      })

      // Send epost
      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: process.env.ADMIN_EMAIL,
        subject: `Ny påmelding til skift: ${data.shiftTitle}`,
        html: `
          <h2>Ny påmelding til skift</h2>
          <p>En frivillig har meldt seg på et skift!</p>
          
          <h3>Frivillig informasjon:</h3>
          <ul>
            <li><strong>Navn:</strong> ${data.volunteerName}</li>
            <li><strong>Epost:</strong> ${data.volunteerEmail}</li>
          </ul>
          
          <h3>Skift informasjon:</h3>
          <ul>
            <li><strong>Skift:</strong> ${data.shiftTitle}</li>
            <li><strong>Dato:</strong> ${data.shiftDate.toLocaleDateString('no-NO', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}</li>
          </ul>
          
          <h3>Kommentar fra frivillig:</h3>
          <p>${data.comment}</p>
          
          <hr>
          <p style="color: #666; font-size: 12px;">
            Dette er en automatisk melding fra FOD Frivillig System.
          </p>
        `,
        text: `
Ny påmelding til skift

En frivillig har meldt seg på et skift!

Frivillig informasjon:
- Navn: ${data.volunteerName}
- Epost: ${data.volunteerEmail}

Skift informasjon:
- Skift: ${data.shiftTitle}
- Dato: ${data.shiftDate.toLocaleDateString('no-NO')}

Kommentar fra frivillig:
${data.comment}

---
Dette er en automatisk melding fra FOD Frivillig System.
        `,
      })
      
      console.log('✅ Epost sendt til admin!')
    } catch (error) {
      console.error('❌ Feil ved sending av epost:', error)
      // Ikke kast feil - la påmeldingen fortsatt gå gjennom selv om epost feiler
    }
  } else {
    console.log('ℹ️  Epostsending er deaktivert (ENABLE_EMAIL=false)')
  }
}
