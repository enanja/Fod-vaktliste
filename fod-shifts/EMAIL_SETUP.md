# Guide: Sette opp ekte epostsending

## Oversikt

Appen er nå konfigurert til å kunne sende ekte eposter via SMTP. Du kan bruke Gmail, Outlook, eller andre epostleverandører.

## Alternativ 1: Gmail (enklest)

### Steg 1: Opprett App Password i Google

1. Gå til [Google Account](https://myaccount.google.com/)
2. Klikk på **Security** (Sikkerhet)
3. Aktiver **2-Step Verification** (Totrinnsbekreftelse) hvis du ikke har det
4. Søk etter **App passwords** (App-passord)
5. Velg:
   - App: **Mail**
   - Device: **Other** → "FOD Shifts"
6. Klikk **Generate** (Generer)
7. Kopier det 16-sifrede passordet som vises

### Steg 2: Oppdater .env

Åpne `.env`-filen og oppdater følgende:

```env
# Aktiver epostsending
ENABLE_EMAIL=true

# Admin-epost som mottar notifikasjoner
ADMIN_EMAIL=din-admin-epost@gmail.com

# Gmail SMTP-innstillinger
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=din-gmail-adresse@gmail.com
SMTP_PASS=ditt-app-passord-her

# Avsender (samme som SMTP_USER for Gmail)
EMAIL_FROM=FOD Frivillig System <din-gmail-adresse@gmail.com>
```

### Steg 3: Restart serveren

```powershell
# Stopp serveren (Ctrl+C i terminalen)
# Start på nytt:
npm run dev
```

### Steg 4: Test

1. Logg inn som frivillig
2. Meld deg på et skift
3. Sjekk admin-eposten din!

---

## Alternativ 2: Outlook/Hotmail

```env
ENABLE_EMAIL=true
ADMIN_EMAIL=din-admin-epost@outlook.com

SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=din-epost@outlook.com
SMTP_PASS=ditt-passord

EMAIL_FROM=FOD Frivillig System <din-epost@outlook.com>
```

---

## Alternativ 3: Andre SMTP-leverandører

### SendGrid (gratis: 100 eposter/dag)

1. Registrer deg på [SendGrid](https://sendgrid.com/)
2. Lag en API key
3. Oppdater .env:

```env
ENABLE_EMAIL=true
ADMIN_EMAIL=admin@fod.local

SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=din-sendgrid-api-key

EMAIL_FROM=FOD Frivillig System <verifisert-avsender@dittdomene.no>
```

### Mailgun, Postmark, etc.

Følg deres dokumentasjon for SMTP-innstillinger og fyll ut tilsvarende i `.env`.

---

## Feilsøking

### "Invalid login" eller "Authentication failed"

**Gmail:**
- Sjekk at du bruker App Password, ikke vanlig passord
- Sjekk at 2-Step Verification er aktivert
- Sørg for at App Password er kopiert riktig (ingen mellomrom)

**Outlook:**
- Sjekk at "Less secure app access" er aktivert (hvis tilgjengelig)
- Prøv å logge inn i epostkontoen fra en nettleser først

### Eposten kommer ikke frem

1. Sjekk spam/søppelpost-mappen
2. Sjekk at ADMIN_EMAIL er riktig
3. Se i server-konsollen for feilmeldinger
4. Verifiser SMTP-innstillingene

### Testing uten ekte epost

Sett `ENABLE_EMAIL=false` i `.env` - da vil eposten bare logges til konsollen.

---

## Sikkerhet

⚠️ **VIKTIG:**

1. **ALDRI commit .env-filen til Git!**
   - `.env` er allerede i `.gitignore`
   - Den inneholder sensitive passord

2. **Bruk App Passwords for Gmail**
   - Ikke bruk ditt vanlige Gmail-passord
   - App Passwords er tryggere og kan slettes når som helst

3. **For produksjon:**
   - Bruk miljøvariabler på serveren (ikke .env-fil)
   - Vurder å bruke en dedikert eposttjeneste som SendGrid

---

## Test-eksempel

Når alt er satt opp riktig, vil admin motta en epost som ser slik ut:

**Emne:** Ny påmelding til skift: Mating av hunder

**Innhold:**
```
Ny påmelding til skift

En frivillig har meldt seg på et skift!

Frivillig informasjon:
- Navn: Anja Engtrø
- Epost: anjaengtro@hotmail.com

Skift informasjon:
- Skift: Mating av hunder
- Dato: mandag 25. november 2025

Kommentar fra frivillig:
Jeg har erfaring med hunder og kan komme litt tidligere hvis nødvendig.
```

---

## Tilleggsfunksjoner (fremtidige forbedringer)

Du kan enkelt utvide epostfunksjonaliteten:

- Send bekreftelse til frivillig når de melder seg på
- Send påminnelse dagen før skiftet
- Send takke-epost etter gjennomført skift
- Send nyhetsbrev til alle frivillige

La meg vite hvis du vil ha hjelp til å implementere noen av disse! 😊
