# FOD Frivillig Skift-app

En enkel webapp for å administrere frivillige skift for dyrevernorganisasjonen FOD.

## Teknologi

- **Next.js 16** med TypeScript og App Router
- **Prisma** med SQLite (lokal database)
- **iron-session** for autentisering
- **bcrypt** for passord-hashing

## Kom i gang

### 1. Installer avhengigheter

Hvis du ikke allerede har gjort det:

```powershell
npm install
```

### 2. Kjør utviklingsserver

```powershell
npm run dev
```

Åpne [http://localhost:3000](http://localhost:3000) i nettleseren din.

## Demo-innlogging

### Admin-bruker
- **Epost:** admin@fod.local
- **Passord:** Admin123!

### Frivillig
- Registrer en ny bruker via "Registrer deg" på innloggingssiden

## Funksjoner

### For frivillige
- ✅ Registrere ny bruker
- ✅ Logge inn og ut
- ✅ Se liste over ledige skift
- ✅ Melde seg på skift med valgfri kommentar
- ✅ Se sine egne påmeldte skift på "Mine skift"
- ✅ Automatisk sjekk om skift er fullt

### For admin
- ✅ Logge inn med forhåndsdefinert admin-bruker
- ✅ Opprette nye skift
- ✅ Se alle skift med antall påmeldinger
- ✅ Se detaljer om påmeldte frivillige (navn, epost, kommentar)

### Notifikasjoner
- 📧 Når en frivillig melder seg på et skift, blir det sendt en epost til admin
- **Standard:** Eposten logges til server-konsollen (terminal hvor `npm run dev` kjører)
- **Ekte epostsending:** Se [EMAIL_SETUP.md](EMAIL_SETUP.md) for å aktivere ekte epostsending via Gmail/Outlook/SMTP

## Database

Databasen er en lokal SQLite-fil: `prisma/dev.db`

### Seed database på nytt

Hvis du vil tilbakestille databasen med admin-brukeren og eksempel-skift:

```powershell
npx prisma migrate reset --force
```

Dette vil:
1. Slette eksisterende data
2. Kjøre migrasjoner på nytt
3. Seede databasen med admin-bruker og 3 eksempel-skift

### Se databasen

For å åpne Prisma Studio og se/redigere data:

```powershell
npx prisma studio
```

## Prosjektstruktur

```
fod-shifts/
├── app/
│   ├── admin/              # Admin-panel
│   ├── api/
│   │   ├── auth/          # Autentisering (login, register, logout)
│   │   ├── shifts/        # Skift-endepunkter
│   │   └── signups/       # Påmeldings-endepunkter
│   ├── login/             # Innloggingsside
│   ├── register/          # Registreringsside
│   ├── shifts/            # Skift-liste for frivillige
│   ├── my-shifts/         # Mine skift
│   └── layout.tsx         # Root layout med AuthProvider
├── lib/
│   ├── AuthContext.tsx    # React Context for autentisering
│   ├── prisma.ts          # Prisma client singleton
│   └── session.ts         # Session-håndtering med iron-session
├── prisma/
│   ├── schema.prisma      # Datamodeller (User, Shift, Signup)
│   ├── seed.ts            # Seed-script
│   └── dev.db             # SQLite database (genereres automatisk)
└── package.json
```

## Datamodeller

### User
- id, name, email, password (hashed), role (admin/volunteer)

### Shift
- id, title, description, date, startTime, endTime, maxVolunteers

### Signup
- id, shiftId, userId, comment, createdAt
- Unikt constraint: En bruker kan kun melde seg på hvert skift én gang

## Nyttige kommandoer

```powershell
# Start utviklingsserver
npm run dev

# Seed database
npm run db:seed

# Tilbakestill database
npx prisma migrate reset --force

# Åpne Prisma Studio
npx prisma studio

# Generer ny Prisma Client (etter endringer i schema)
npx prisma generate

# Opprett ny migrasjon
npx prisma migrate dev --name beskrivelse_av_endring
```

## Produksjon

For å bygge til produksjon:

```powershell
npm run build
npm start
```

## Fremtidige forbedringer

- 🔐 Legg til "Glemt passord" funksjonalitet
- ✉️ Implementer ekte epost-sending med Nodemailer
- 🗑️ La frivillige melde seg av skift
- ✏️ La admin redigere og slette skift
- 📊 Dashboard med statistikk for admin
- 🔔 Påminnelser for kommende skift
- 📱 Responsivt design for mobil

## Lisens

Dette er et demo-prosjekt for FOD.
