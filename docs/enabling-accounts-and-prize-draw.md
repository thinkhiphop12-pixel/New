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
2. SQL Editor → run `supabase/migrations/0001_comp_and_accounts.sql`, then
   `0002_account_gated_entry.sql`, in that order. Both are safe to re-run.
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
COMP_REQUIRE_ACCOUNT=1
COMP_REQUIRE_VERIFICATION=0
```

`COMP_REQUIRE_ACCOUNT=1` (the default) means entrants must sign in. **Leave it
on.** It is what makes the draw defensible: the address comes from the verified
session rather than from a text box, so entering a hundred times means creating
a hundred real Google accounts rather than typing a hundred addresses. It also
removes the need to build a separate confirmation flow, because the identity
provider has already done that job.

Setting it to `0` falls back to typed-email entry. Only reasonable for a prize
too small to be worth farming, and even then entries stay unverified.

Note that this gates **entry, not play**. Every game stays free with no account,
so the "no sign up" claim in the homepage title remains true.

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
```

`prize` is already set to `£1,000` and `requireAccount` to `true`; change them
only if the promotion itself changes. `requireAccount` must match
`COMP_REQUIRE_ACCOUNT` on the server — the server is the side that enforces it,
so a mismatch shows the wrong form rather than opening a hole.

### Before you switch it on

- Fill in every `[...]` field in `competition-terms.html` and remove its
  `noindex` tag.
- Have the terms reviewed. The prize is valuable enough that an hour of a
  solicitor's time is cheap.
- A cash prize has no transferability problem, which is one fewer thing to
  verify. Decide how it is paid (bank transfer is simplest) and how long the
  winner has to supply details.

### Email confirmation

Not needed while `COMP_REQUIRE_ACCOUNT=1`. Account-backed entries are written
with `verified = true` because the identity provider confirmed the mailbox
before Supabase would issue a session — Google will not hand out a token for an
address nobody controls, and a magic link proves control by definition.

It only matters if you switch to typed-email entry. In that mode entries stay
unverified, and `comp_entry_counts` excludes them, so the draw would have
nothing to pick from until you build it: send a link to
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

**Required before the prize draw can run**, since entry is account-gated. Do
this section first if you are enabling both.

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
