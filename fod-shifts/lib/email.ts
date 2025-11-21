type SendEmailOptions = {
  to: string
  subject: string
  html: string
  text: string
}

type SignupNotificationStatus = 'CONFIRMED' | 'WAITLISTED'

type AdminSignupNotificationData = {
  volunteerName: string
  volunteerEmail: string
  shiftTitle: string
  shiftDate: Date
  comment: string
  status: SignupNotificationStatus
}

type WaitlistPromotionNotificationData = {
  volunteerName: string
  volunteerEmail: string
  shiftTitle: string
  shiftDate: Date
  comment?: string | null
}

type CancellationNotificationData = {
  volunteerName: string
  volunteerEmail: string
  shiftTitle: string
  shiftDate: Date
  initiatedByAdmin: boolean
}

type VolunteerCancellationNotificationData = {
  volunteerName: string
  volunteerEmail: string
  shiftTitle: string
  shiftDate: Date
  initiatedByAdmin: boolean
}

type VolunteerReminderData = {
  volunteerName: string
  volunteerEmail: string
  shiftTitle: string
  shiftDate: Date
  shiftStart: string
  shiftEnd: string
  notes?: string | null
}

type VolunteerAddedByAdminData = {
  volunteerName: string
  volunteerEmail: string
  shiftTitle: string
  shiftDate: Date
  shiftStart: string
  shiftEnd: string
  notes?: string | null
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

function formatShiftDate(shiftDate: Date) {
  return shiftDate.toLocaleDateString('no-NO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export async function sendAdminSignupNotificationEmail(data: AdminSignupNotificationData) {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@fod.local'
  const statusLabel = data.status === 'CONFIRMED' ? 'påmelding' : 'venteliste'

  console.log('📧 === EPOST TIL ADMIN (ny', statusLabel, ') ===')
  console.log('Til:', adminEmail)
  console.log(`Frivillig: ${data.volunteerName}`)
  console.log(`Epost: ${data.volunteerEmail}`)
  console.log(`Skift: ${data.shiftTitle}`)
  console.log(`Dato: ${formatShiftDate(data.shiftDate)}`)
  console.log(`Kommentar: ${data.comment || '-'}`)
  console.log('========================================')

  const intro =
    data.status === 'CONFIRMED'
      ? 'En frivillig har fått plass på et skift!'
      : 'En frivillig har stilt seg på venteliste til et skift.'

  await sendEmail({
    to: adminEmail,
    subject:
      data.status === 'CONFIRMED'
        ? `Ny påmelding til skift: ${data.shiftTitle}`
        : `Ny venteliste-innmelding: ${data.shiftTitle}`,
    html: `
      <h2>${intro}</h2>
      <h3>Frivillig informasjon:</h3>
      <ul>
        <li><strong>Navn:</strong> ${data.volunteerName}</li>
        <li><strong>Epost:</strong> ${data.volunteerEmail}</li>
      </ul>
      <h3>Skift informasjon:</h3>
      <ul>
        <li><strong>Skift:</strong> ${data.shiftTitle}</li>
        <li><strong>Dato:</strong> ${formatShiftDate(data.shiftDate)}</li>
      </ul>
      <h3>Kommentar fra frivillig:</h3>
      <p>${data.comment || 'Ingen kommentar oppgitt.'}</p>
      <p style="color: #666; font-size: 12px;">Dette er en automatisk melding fra FOD Frivillig System.</p>
    `,
    text: `${intro}\n\nFrivillig informasjon:\n- Navn: ${data.volunteerName}\n- Epost: ${data.volunteerEmail}\n\nSkift informasjon:\n- Skift: ${data.shiftTitle}\n- Dato: ${formatShiftDate(data.shiftDate)}\n\nKommentar fra frivillig:\n${data.comment || 'Ingen kommentar oppgitt.'}\n\n---\nDette er en automatisk melding fra FOD Frivillig System.`,
  })
}

export async function sendAdminWaitlistPromotionEmail(data: WaitlistPromotionNotificationData) {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@fod.local'

  console.log('📧 === EPOST TIL ADMIN (venteliste -> plass) ===')
  console.log('Til:', adminEmail)
  console.log(`Frivillig: ${data.volunteerName}`)
  console.log(`Skift: ${data.shiftTitle}`)
  console.log(`Dato: ${formatShiftDate(data.shiftDate)}`)
  console.log('========================================')

  await sendEmail({
    to: adminEmail,
    subject: `Ventelisteoppdatering: ${data.shiftTitle}`,
    html: `
      <h2>Frivillig fått plass fra venteliste</h2>
      <p>En frivillig er automatisk flyttet fra venteliste til aktiv påmeldingsliste.</p>
      <h3>Frivillig</h3>
      <ul>
        <li><strong>Navn:</strong> ${data.volunteerName}</li>
        <li><strong>Epost:</strong> ${data.volunteerEmail}</li>
      </ul>
      <h3>Skift</h3>
      <ul>
        <li><strong>Tittel:</strong> ${data.shiftTitle}</li>
        <li><strong>Dato:</strong> ${formatShiftDate(data.shiftDate)}</li>
      </ul>
      <p style="color: #666; font-size: 12px;">Dette er en automatisk melding fra FOD Frivillig System.</p>
    `,
    text: `En frivillig er flyttet fra venteliste til påmeldingslisten.\n\nFrivillig:\n- Navn: ${data.volunteerName}\n- Epost: ${data.volunteerEmail}\n\nSkift:\n- ${data.shiftTitle}\n- ${formatShiftDate(data.shiftDate)}\n\n---\nDette er en automatisk melding fra FOD Frivillig System.`,
  })
}

export async function sendVolunteerPromotionEmail(data: WaitlistPromotionNotificationData) {
  if (!isEmailEnabled) {
    console.log('ℹ️  Epost til frivillig (promotert fra venteliste) er deaktivert.')
    return
  }

  console.log('📧 === EPOST TIL FRIVILLIG (venteliste -> plass) ===')
  console.log('Til:', data.volunteerEmail)
  console.log(`Skift: ${data.shiftTitle}`)
  console.log(`Dato: ${formatShiftDate(data.shiftDate)}`)
  console.log('========================================')

  await sendEmail({
    to: data.volunteerEmail,
    subject: `Du har fått plass på skift: ${data.shiftTitle}`,
    html: `
      <p>Hei ${data.volunteerName},</p>
      <p>God nyhet! Du har fått plass på skiftet <strong>${data.shiftTitle}</strong> den <strong>${formatShiftDate(data.shiftDate)}</strong>.</p>
      <p>Hvis tiden ikke lenger passer er det fint om du melder deg av i systemet så raskt som mulig.</p>
      <p>Vi sees på senteret!</p>
      <br />
      <p>Vennlig hilsen<br />FOD Frivillig System</p>
    `,
    text: `Hei ${data.volunteerName},\n\nDu har fått plass på skiftet "${data.shiftTitle}" den ${formatShiftDate(data.shiftDate)}.\n\nHvis tiden ikke passer lenger kan du melde deg av i systemet.\n\nVennlig hilsen\nFOD Frivillig System`,
  })
}

export async function sendAdminCancellationEmail(data: CancellationNotificationData) {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@fod.local'

  console.log('📧 === EPOST TIL ADMIN (avmelding) ===')
  console.log('Til:', adminEmail)
  console.log(`Frivillig: ${data.volunteerName}`)
  console.log(`Skift: ${data.shiftTitle}`)
  console.log(`Dato: ${formatShiftDate(data.shiftDate)}`)
  console.log('========================================')

  const initiatorLabel = data.initiatedByAdmin
    ? 'En administrator har fjernet en frivillig fra et skift.'
    : 'En frivillig har meldt seg av et skift.'

  await sendEmail({
    to: adminEmail,
    subject: `Avmelding: ${data.shiftTitle}`,
    html: `
      <h2>${initiatorLabel}</h2>
      <h3>Frivillig</h3>
      <ul>
        <li><strong>Navn:</strong> ${data.volunteerName}</li>
        <li><strong>Epost:</strong> ${data.volunteerEmail}</li>
      </ul>
      <h3>Skift</h3>
      <ul>
        <li><strong>Tittel:</strong> ${data.shiftTitle}</li>
        <li><strong>Dato:</strong> ${formatShiftDate(data.shiftDate)}</li>
      </ul>
      <p style="color: #666; font-size: 12px;">Dette er en automatisk melding fra FOD Frivillig System.</p>
    `,
    text: `${initiatorLabel}\n\nFrivillig:\n- Navn: ${data.volunteerName}\n- Epost: ${data.volunteerEmail}\n\nSkift:\n- ${data.shiftTitle}\n- ${formatShiftDate(data.shiftDate)}\n\n---\nDette er en automatisk melding fra FOD Frivillig System.`,
  })
}

export async function sendVolunteerCancellationEmail(
  data: VolunteerCancellationNotificationData
) {
  if (!isEmailEnabled) {
    console.log('ℹ️  Epost til frivillig (avmelding) er deaktivert.')
    return
  }

  console.log('📧 === EPOST TIL FRIVILLIG (avmelding) ===')
  console.log('Til:', data.volunteerEmail)
  console.log(`Skift: ${data.shiftTitle}`)
  console.log(`Dato: ${formatShiftDate(data.shiftDate)}`)
  console.log('========================================')

  const intro = data.initiatedByAdmin
    ? 'En administrator har fjernet deg fra dette skiftet.'
    : 'Du har meldt deg av skiftet.'

  await sendEmail({
    to: data.volunteerEmail,
    subject: `Bekreftelse på avmelding: ${data.shiftTitle}`,
    html: `
      <p>Hei ${data.volunteerName},</p>
      <p>${intro}</p>
      <p><strong>Skift:</strong> ${data.shiftTitle}</p>
      <p><strong>Dato:</strong> ${formatShiftDate(data.shiftDate)}</p>
      <p>Ta kontakt med administrasjonen dersom noe er uklart.</p>
      <br />
      <p>Vennlig hilsen<br />FOD Frivillig System</p>
    `,
    text: `Hei ${data.volunteerName},

${intro}

Skift: ${data.shiftTitle}
Dato: ${formatShiftDate(data.shiftDate)}

Ta kontakt med administrasjonen dersom noe er uklart.

Vennlig hilsen
FOD Frivillig System`,
  })
}

export async function sendVolunteerReminderEmail(data: VolunteerReminderData) {
  if (!isEmailEnabled) {
    console.log('ℹ️  Epost til frivillig (påminnelse) er deaktivert.')
    return
  }

  console.log('📧 === EPOST TIL FRIVILLIG (påminnelse) ===')
  console.log('Til:', data.volunteerEmail)
  console.log(`Skift: ${data.shiftTitle}`)
  console.log(`Dato: ${formatShiftDate(data.shiftDate)}`)
  console.log('========================================')

  await sendEmail({
    to: data.volunteerEmail,
    subject: `Påminnelse: ${data.shiftTitle} ${formatShiftDate(data.shiftDate)}`,
    html: `
      <p>Hei ${data.volunteerName},</p>
      <p>Dette er en vennlig påminnelse om at du er satt opp på skiftet <strong>${data.shiftTitle}</strong>.</p>
      <p><strong>Tid:</strong> ${data.shiftStart} – ${data.shiftEnd}</p>
      ${data.notes ? `<p><strong>Notater:</strong> ${data.notes}</p>` : ''}
      <p>Gi oss beskjed dersom du ikke kan møte opp.</p>
      <br />
      <p>Vennlig hilsen<br />FOD Frivillig System</p>
    `,
    text: `Hei ${data.volunteerName},

Dette er en vennlig påminnelse om at du er satt opp på skiftet "${data.shiftTitle}".

Tid: ${data.shiftStart} – ${data.shiftEnd}
${data.notes ? `Notater: ${data.notes}
` : ''}
Gi oss beskjed dersom du ikke kan møte opp.

Vennlig hilsen
FOD Frivillig System`,
  })
}

export async function sendVolunteerAddedByAdminEmail(data: VolunteerAddedByAdminData) {
  if (!isEmailEnabled) {
    console.log('ℹ️  Epost til frivillig (lagt til av admin) er deaktivert.')
    return
  }

  console.log('📧 === EPOST TIL FRIVILLIG (lagt til av admin) ===')
  console.log('Til:', data.volunteerEmail)
  console.log(`Skift: ${data.shiftTitle}`)
  console.log(`Dato: ${formatShiftDate(data.shiftDate)}`)
  console.log('========================================')

  await sendEmail({
    to: data.volunteerEmail,
    subject: `Du er satt opp på skift: ${data.shiftTitle}`,
    html: `
      <p>Hei ${data.volunteerName},</p>
      <p>En administrator har lagt deg til på skiftet <strong>${data.shiftTitle}</strong>.</p>
      <p><strong>Dato:</strong> ${formatShiftDate(data.shiftDate)}</p>
      <p><strong>Tid:</strong> ${data.shiftStart} – ${data.shiftEnd}</p>
      ${data.notes ? `<p><strong>Notater:</strong> ${data.notes}</p>` : ''}
      <p>Gi beskjed dersom tidspunktet ikke passer.</p>
      <br />
      <p>Vennlig hilsen<br />FOD Frivillig System</p>
    `,
    text: `Hei ${data.volunteerName},

  En administrator har lagt deg til på skiftet "${data.shiftTitle}".

  Dato: ${formatShiftDate(data.shiftDate)}
  Tid: ${data.shiftStart} – ${data.shiftEnd}
  ${data.notes ? `Notater: ${data.notes}
  ` : ''}
  Gi beskjed dersom tidspunktet ikke passer.

  Vennlig hilsen
  FOD Frivillig System`,
  })
}

type VolunteerInviteEmailData = {
  to: string
  applicantName: string
  registerUrl: string
}

export async function sendVolunteerInviteEmail(data: VolunteerInviteEmailData) {
  console.log('📧 === EPOST TIL SØKER (godkjenning) ===')
  console.log('Til:', data.to)
  console.log('Lenke:', data.registerUrl)
  console.log('========================================')

  if (!isEmailEnabled) {
    console.log('ℹ️  Ekte e-post er deaktivert. Over sendtes lenken i loggen.')
    return
  }

  await sendEmail({
    to: data.to,
    subject: 'Du er godkjent som frivillig hos FOD',
    html: `
      <p>Hei ${data.applicantName},</p>
      <p>Hurra! Søknaden din om å bli frivillig hos FOD er godkjent.</p>
      <p>Gå til registreringssiden for å opprette en brukerkonto med samme e-postadresse som du brukte i søknaden:</p>
      <p><a href="${data.registerUrl}" target="_blank" rel="noopener noreferrer">Åpne registreringssiden</a></p>
      <p>Vi gleder oss til å ha deg med på laget!</p>
      <br />
      <p>Vennlig hilsen<br />FOD Frivillig System</p>
    `,
    text: `Hei ${data.applicantName},

Hurra! Søknaden din om å bli frivillig hos FOD er godkjent.

Gå til registreringssiden for å opprette bruker med samme e-post som i søknaden:
${data.registerUrl}

Vi gleder oss til å ha deg med på laget!

Vennlig hilsen
FOD Frivillig System`,
  })
}

type VolunteerApplicationRejectedEmailData = {
  to: string
  applicantName: string
}

export async function sendVolunteerApplicationRejectedEmail(
  data: VolunteerApplicationRejectedEmailData
) {
  console.log('📧 === EPOST TIL SØKER (avslag) ===')
  console.log('Til:', data.to)
  console.log('========================================')

  if (!isEmailEnabled) {
    console.log('ℹ️  Ekte e-post er deaktivert. Ingen e-post sendt.')
    return
  }

  await sendEmail({
    to: data.to,
    subject: 'Søknad om å bli frivillig hos FOD',
    html: `
      <p>Hei ${data.applicantName},</p>
      <p>Takk for at du søkte om å bli frivillig hos FOD.</p>
      <p>Denne gangen har vi dessverre ikke mulighet til å ta deg inn, men vi setter stor pris på engasjementet ditt.</p>
      <p>Du er velkommen til å søke igjen senere.</p>
      <br />
      <p>Vennlig hilsen<br />FOD Frivillig System</p>
    `,
    text: `Hei ${data.applicantName},

Takk for at du søkte om å bli frivillig hos FOD.

Denne gangen har vi dessverre ikke mulighet til å ta deg inn, men vi setter stor pris på engasjementet ditt.

Du er velkommen til å søke igjen senere.

Vennlig hilsen
FOD Frivillig System`,
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
