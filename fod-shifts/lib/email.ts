type SendEmailOptions = {
  to: string
  subject: string
  html: string
  text: string
}

type AdminNotificationData = {
  volunteerName: string
  volunteerEmail: string
  shiftTitle: string
  shiftDate: Date
  comment: string
}

type PasswordResetData = {
  to: string
  userName: string
  resetUrl: string
}

const isEmailEnabled = process.env.ENABLE_EMAIL === 'true'

async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
  if (!process.env.EMAIL_FROM) {
    console.warn('⚠️  EMAIL_FROM er ikke satt. Kan ikke sende epost.')
    return
  }

  if (!isEmailEnabled) {
    console.log('ℹ️  Epostsending er deaktivert (ENABLE_EMAIL=false).')
    return
  }

  try {
    const nodemailer = await import('nodemailer')

    const transporter = nodemailer.default.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })

    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
      text,
    })

    console.log(`✅ Epost sendt til ${to}`)
  } catch (error) {
    console.error('❌ Feil ved sending av epost:', error)
  }
}

export async function sendAdminNotificationEmail(data: AdminNotificationData) {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@fod.local'

  console.log('📧 === EPOST TIL ADMIN (skiftpåmelding) ===')
  console.log('Til:', adminEmail)
  console.log(`Frivillig: ${data.volunteerName}`)
  console.log(`Epost: ${data.volunteerEmail}`)
  console.log(`Skift: ${data.shiftTitle}`)
  console.log(`Dato: ${data.shiftDate.toLocaleDateString('no-NO')}`)
  console.log(`Kommentar: ${data.comment}`)
  console.log('========================================')

  await sendEmail({
    to: adminEmail,
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
      <hr />
      <p style="color: #666; font-size: 12px;">Dette er en automatisk melding fra FOD Frivillig System.</p>
    `,
    text: `Ny påmelding til skift\n\nEn frivillig har meldt seg på et skift!\n\nFrivillig informasjon:\n- Navn: ${data.volunteerName}\n- Epost: ${data.volunteerEmail}\n\nSkift informasjon:\n- Skift: ${data.shiftTitle}\n- Dato: ${data.shiftDate.toLocaleDateString('no-NO')}\n\nKommentar fra frivillig:\n${data.comment}\n\n---\nDette er en automatisk melding fra FOD Frivillig System.`,
  })
}

export async function sendPasswordResetEmail(data: PasswordResetData) {
  console.log('📧 === EPOST TIL BRUKER (glemt passord) ===')
  console.log('Til:', data.to)
  console.log(`Lenke: ${data.resetUrl}`)
  console.log('========================================')

  await sendEmail({
    to: data.to,
    subject: 'Tilbakestill passord – FOD Frivillig',
    html: `
      <p>Hei ${data.userName},</p>
      <p>Vi har mottatt en forespørsel om å tilbakestille passordet ditt.</p>
      <p>Trykk på lenken under for å opprette et nytt passord:</p>
      <p><a href="${data.resetUrl}" target="_blank" rel="noopener noreferrer">Tilbakestill passord</a></p>
      <p>Dersom du ikke ba om dette, kan du ignorere denne e-posten.</p>
      <p>Lenken er gyldig i 1 time.</p>
      <br />
      <p>Vennlig hilsen<br />FOD Frivillig System</p>
    `,
    text: `Hei ${data.userName},\n\nVi har mottatt en forespørsel om å tilbakestille passordet ditt.\n\nÅpne lenken for å opprette nytt passord (gyldig i 1 time):\n${data.resetUrl}\n\nDersom du ikke ba om dette, kan du ignorere e-posten.\n\nVennlig hilsen\nFOD Frivillig System`,
  })
}
