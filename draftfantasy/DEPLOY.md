# Putting the game online — step by step

Plain-English guide. You'll do two short things: **(A) put the game on the web with Vercel**, and
**(B) flip the database switch in Supabase** so "save your run" works. Your existing `ballknw.com`
site is not touched by any of this.

You only need to do this once. Set aside ~15 minutes.

---

## A. Put the game online (Vercel)

Vercel is a free "landlord" that keeps the game online. It connects to your GitHub.

1. Go to **https://vercel.com** and click **Sign Up** (choose **Continue with GitHub** and approve).
2. On your Vercel dashboard, click **Add New… → Project**.
3. Find the repository **`thinkhiphop12-pixel/New`** in the list and click **Import**.
4. On the configuration screen, find **Root Directory** and click **Edit**. Choose the folder
   named **`draftfantasy`**. (This tells Vercel the game lives in that folder.)
5. Open the **Environment Variables** section and add these two (copy the name and value exactly):

   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://okghgvobjdysqxslibab.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_dT7dQqMP_h5OLF3pe78NbA_3wzCo4mo` |

6. Click **Deploy** and wait a minute or two. When it finishes, Vercel shows a **Visit** button with
   your new web address (something like `your-project.vercel.app`). That's the game, live.

The homepage has a button to the game, and the game also lives at `…/perfect/8-0`.

---

## B. Flip the database switch (Supabase)

This makes runs save to the cloud (and show up across devices). Until you do this, the game still
works fine — it just remembers runs on each player's own device.

1. Go to **https://supabase.com**, sign in, and open your project.
2. In the left menu click **SQL Editor**, then **New query**.
3. Open the file **`draftfantasy/supabase/migrations/20250629214100_initial_schema.sql`** from this
   repository, copy **all** of its text, and paste it into the editor.
4. Click **Run**. You should see "Success". That's it — the cloud save is now on.

(Optional) To pre-load the squad/player tables in the cloud, see the "Import squad/player data"
section in `draftfantasy/README.md`. It's not required for the game to work.

---

## Done

- Game online: your Vercel address.
- Saving runs to the cloud: working after step B.
- Your current `ballknw.com` site: unchanged throughout.

If you ever want to use your own domain (e.g. a custom web address) for the game, Vercel →
Project → **Settings → Domains** lets you add one.
