# Turning on accounts and the prize draw

Both features are built and both are switched off. Nothing in either reaches a
visitor until the flags below are flipped, and neither changes how guest play
works today.

Read this in order. Steps 1–3 are infrastructure. **Step 4 is not optional** —
the live privacy policy currently states the opposite of what these features do.

---

## 1. Create the Supabase project

1. New project at [supabase.com](https://supabase.com). Any region; pick one near
   most of your players.
2. SQL Editor → paste `supabase/migrations/0001_comp_and_accounts.sql` → Run.
   It is safe to re-run.
3. Settings → API. You need three values:

| Value | Where it goes | Secret? |
|---|---|---|
| Project URL | `SUPABASE_URL` and `AUTH.url` | no |
| `anon` public key | `AUTH.anonKey` in `shared/auth.js` | no — row-level security does the work |
| `service_role` key | `SUPABASE_SERVICE_ROLE_KEY` | **yes — never put this in the browser** |

The service role key bypasses row-level security. It belongs only in Vercel's
environment variables. If it ever appears in a file under `shared/`, rotate it.

---

## 2. Prize draw

### Environment variables (Vercel → Settings → Environment Variables)

```
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role key>
COMP_HASH_SALT=<openssl rand -hex 32>
COMP_ENABLED=1
COMP_REQUIRE_VERIFICATION=0
```

`COMP_HASH_SALT` salts the hashes of visitor IP addresses. Without it the
endpoints refuse to run, deliberately: the IPv4 space is small enough that an
unsalted hash can be reversed by brute force, so an unsalted deployment would be
storing personal data in a form only pretending to be anonymous. **Set it once
and never change it** — changing it invalidates every existing referral, because
the same visitor will hash to a different value.

### Client

In `shared/comp.js`:

```js
enabled: true,
api: '/api',
closesISO: '2027-04-30T23:59:59Z',   // your real closing date
prize: '...',                        // the real prize, once decided
```

### Before you switch it on

- Fill in every `[...]` field in `competition-terms.html` and remove its
  `noindex` tag.
- Have the terms reviewed. The prize is valuable enough that an hour of a
  solicitor's time is cheap.
- Confirm in writing that the prize can lawfully be transferred to a winner.
  Match tickets are commonly personalised and non-transferable, and admission
  can be refused where the name does not match.

### Email confirmation

Not wired up yet, at your request. Entrants are stored with `verified` set from
`COMP_REQUIRE_VERIFICATION`, and `comp_entry_counts` already filters on it, so
turning verification on later needs no change to how the draw is run.

**Do not run a draw for a valuable prize without it.** An unverified address is
one script away from unlimited entries. To add it: send a link to
`?verify=<verify_token>` on entry, set `verified = true` when it is followed,
then set `COMP_REQUIRE_VERIFICATION=1`.

### Picking a winner

```sql
-- Every verified entry, one row per entry, ordered randomly.
select e.code, e.email
  from comp_entrants e
  join comp_referrals r on r.entrant_id = e.id
 where e.verified
 order by random()
 limit 1;
```

Screen-record it. "Drawn at random" is a claim you may have to stand behind.

---

## 3. Accounts

### Supabase dashboard

1. Authentication → Providers → enable **Google** and **Email**.
   - Google: create an OAuth client in Google Cloud Console, paste the client ID
     and secret. Free.
   - Email: magic links are on by default. No passwords to leak.
   - Apple: needs a paid Apple Developer account ($99/year). Leave
     `providers.apple` false until that exists.
2. Authentication → URL Configuration → add `https://www.ballknw.com/` to the
   allowed redirect URLs, or the provider will refuse the round trip.

### Client

In `shared/auth.js`:

```js
enabled: true,
url: 'https://<project>.supabase.co',
anonKey: '<anon key>',
```

The `anon` key is meant to be public. Every table it can reach is fenced by
row-level security to the signed-in user's own rows.

---

## 4. Update the privacy policy — required

`privacy.html` currently says, in these words:

> The site has no sign-up, no login and no user accounts. We don't ask for your
> name, email address or any other personal information to play.

That is true today and false the moment either feature goes live. Replace that
section with something like:

> **Accounts (optional)**
> You can play everything on this site without an account, and that remains the
> default. If you choose to sign in, we store your email address and your game
> saves so your career can follow you between devices. That is all we store. We
> do not sell it, share it, or use it for marketing. You can sign out at any
> time, and you can ask us to delete your account and saves by emailing
> thinkhiphop12@gmail.com.
>
> **Prize draw (optional)**
> If you enter a prize draw we store your email address, your referral code, and
> a count of verified referrals, solely to run the draw and contact the winner.
> We also store a salted hash of the IP address of visitors who arrive on a
> referral link, to stop one person entering many times; the address itself is
> never stored. Entrant data is deleted within 30 days of the winner being
> confirmed.

Thirty days is what you asked for. It is also what `competition-terms.html`
should say, so keep the two in step.

---

## Rolling back

Both features fail closed, so switching off is safe and immediate:

- Prize draw: set `COMP_ENABLED=0`, or `enabled: false` in `shared/comp.js`. The
  endpoints return `503 not_configured` and the modal tells visitors entries are
  not open rather than pretending to enrol them.
- Accounts: set `enabled: false` in `shared/auth.js`. The sign-in link hides
  itself and the Supabase SDK is never fetched.

Neither rollback touches a local save. Guest play is unaffected either way,
which is the whole point of building them this way.
