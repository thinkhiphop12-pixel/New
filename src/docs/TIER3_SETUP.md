# Tier 3: Backend & Email Setup Guide

This guide explains how to set up email capture and analytics for automated marketing.

## Overview

Tier 3 enables:
- Email capture via opt-in modal at end of games
- Event tracking for user behavior analytics
- Leaderboards via Supabase database
- Email campaigns via SendGrid or similar service

**Infrastructure:**
- **Supabase** (PostgreSQL database + auth) - Already configured in `.mcp.json`
- **Mailer** (SendGrid, Mailchimp, or custom) - Optional, future integration
- **API routes** - Already created in `/footballmanager/app/api/`

---

## Quick Start

### 1. Set Up Supabase

1. Visit https://app.supabase.com
2. Create a new project or use the existing one (`okghgvobjdysqxslibab` from `.mcp.json`)
3. Go to **Settings → API**
4. Copy your project credentials:
   - **URL**: `https://[PROJECT_ID].supabase.co`
   - **Anon Key**: The public key (safe for frontend)
   - **Service Key**: The secret key (keep private, server-only)

### 2. Configure Environment Variables

```bash
cp footballmanager/.env.example footballmanager/.env.local
```

Edit `footballmanager/.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_KEY=eyJhbGci...
```

### 3. Create Database Tables

Choose ONE method:

#### Option A: Supabase Dashboard (Easiest)

1. Go to **SQL Editor** in Supabase
2. Create new query
3. Copy-paste contents of `supabase/migrations/001_create_emails_table.sql`
4. Run the query
5. Repeat for `002_create_user_events_table.sql`

#### Option B: Supabase CLI

```bash
npm install -g supabase
supabase link --project-ref okghgvobjdysqxslibab
supabase db push
```

#### Option C: Manual SQL

Connect to your Supabase database directly and run both migration files.

### 4. Verify Tables Exist

In Supabase dashboard:
1. Go to **Database → Tables**
2. Verify `emails` table exists with columns:
   - `id` (UUID)
   - `email` (VARCHAR)
   - `games` (TEXT[])
   - `consent_date` (TIMESTAMP)
   - `created_at` (TIMESTAMP)

3. Verify `user_events` table exists with columns:
   - `id` (UUID)
   - `event_type` (VARCHAR)
   - `game` (VARCHAR)
   - `user_id` (VARCHAR)
   - `metadata` (JSONB)
   - `created_at` (TIMESTAMP)

### 5. Test Email Capture

Install dependencies:
```bash
cd footballmanager
npm install
```

Start dev server:
```bash
npm run dev
```

Open http://localhost:3000 and play a game. At the end, the email modal should appear.

Submit a test email - it should appear in Supabase `emails` table within seconds.

---

## API Endpoints

### POST /api/capture-email

Captures user email for marketing.

**Request:**
```json
{
  "email": "user@example.com",
  "game": "scout",
  "score": 100,
  "streak": 7,
  "consentDate": "2026-07-05T10:00:00Z"
}
```

**Response:**
```json
{
  "message": "Email captured successfully",
  "email": "user@example.com"
}
```

### POST /api/track-event

Tracks user behavior.

**Request:**
```json
{
  "eventType": "game_complete",
  "game": "scout",
  "userId": "device_123",
  "metadata": {
    "score": 100,
    "streak": 7,
    "duration": 300
  }
}
```

**Response:**
```json
{
  "message": "Event tracked",
  "eventType": "game_complete"
}
```

### GET /api/capture-email & /api/track-event

Health checks. Return `200 OK` with status.

---

## Component Integration

### Adding Email Modal to Games

The `EmailOptinModal` component is ready to use:

```tsx
import { EmailOptinModal } from '@/components/EmailOptinModal';

export function GameEndScreen() {
  const [showEmailModal, setShowEmailModal] = useState(false);

  return (
    <>
      {showEmailModal && (
        <EmailOptinModal
          gameName="scout"
          score={100}
          streak={7}
          onClose={() => setShowEmailModal(false)}
        />
      )}
    </>
  );
}
```

Props:
- `gameName`: `'scout'` or `'gaffer'`
- `score`: Optional game score
- `streak`: Optional streak count
- `onClose`: Callback when modal closes

### Tracking Events

From frontend:

```typescript
async function trackEvent(eventType: string, metadata?: any) {
  await fetch('/api/track-event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      eventType,
      game: 'scout',
      userId: getDeviceId(),
      metadata,
    }),
  });
}

// Usage:
await trackEvent('game_complete', { score: 100, streak: 7 });
```

---

## Email Campaign Workflow

To enable automated email campaigns:

### 1. Connect SendGrid or Mailchimp

Create an API key in your email service provider.

### 2. Create Server Function

In `footballmanager/lib/email.ts`:

```typescript
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export async function sendPuzzleEmail(email: string, theme: string) {
  await sgMail.send({
    to: email,
    from: 'hello@ballknw.com',
    subject: `Scout Puzzle: ${theme}`,
    html: `
      <h1>Today's Puzzle: ${theme}</h1>
      <p><a href="https://ballknw.com/scout">Play Scout →</a></p>
    `,
  });
}
```

### 3. Schedule Email Job

Using GitHub Actions or a cron job:

```bash
# Send daily email to all subscribers
node scripts/send-daily-emails.mjs
```

---

## Monitoring & Analytics

### Querying Supabase Data

In Supabase **SQL Editor**:

```sql
-- Top games by signup
SELECT game, COUNT(*) as count
FROM emails
GROUP BY game
ORDER BY count DESC;

-- Event metrics
SELECT
  event_type,
  COUNT(*) as total,
  DATE(created_at) as date
FROM user_events
GROUP BY event_type, DATE(created_at)
ORDER BY date DESC;

-- User retention
SELECT
  DATE(created_at) as signup_date,
  COUNT(*) as new_users
FROM emails
GROUP BY DATE(created_at)
ORDER BY signup_date DESC;
```

### Dashboard Ideas

- Email signup trends
- Top games by engagement
- Streak achievements
- Daily active users (DAU)
- Retention by cohort

---

## Privacy & GDPR Compliance

All systems are privacy-first:

✅ **No user accounts required** - Uses device IDs only
✅ **Explicit consent** - Email captured via opt-in modal
✅ **Unsubscribe link** - Every email includes unsubscribe option
✅ **GDPR compliant** - Consent dates tracked, deletion possible
✅ **Data minimal** - Only email + game data stored
✅ **No third-party tracking** - All data stays in Supabase

To enable GDPR deletion:

```sql
DELETE FROM emails WHERE email = 'user@example.com' AND unsubscribed = true;
```

---

## Troubleshooting

### Email not captured?

1. Check browser console for errors
2. Verify Supabase credentials in `.env.local`
3. Check Supabase dashboard for `emails` table
4. Test with `curl`:

```bash
curl -X POST http://localhost:3000/api/capture-email \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "game": "scout"}'
```

### Events not tracked?

1. Check Supabase `user_events` table exists
2. Check RLS policies are enabled (should allow inserts)
3. Check `NEXT_PUBLIC_SUPABASE_URL` is correct
4. Dev mode logs events to console if Supabase unavailable

### Performance issues?

1. Ensure indexes exist:
   ```sql
   SELECT * FROM pg_indexes WHERE tablename = 'emails';
   SELECT * FROM pg_indexes WHERE tablename = 'user_events';
   ```

2. Archive old events:
   ```sql
   DELETE FROM user_events WHERE created_at < NOW() - INTERVAL '90 days';
   ```

---

## Next Steps

1. ✅ Set up Supabase tables
2. ✅ Configure environment variables
3. ✅ Test email capture in dev
4. 📧 Integrate SendGrid for email sends
5. 🔄 Set up daily email job
6. 📊 Create analytics dashboard
7. 🎯 Set up A/B testing on email copy

See `GROWTH_STRATEGY.md` for additional user acquisition tactics.
