# Publish Notiva — the 100% click-through guide

No terminal, no command line, nothing to install. Just three free accounts
(Supabase, GitHub, Netlify) and about 15 minutes of clicking.

---

## Part 1 — Supabase (your database)

1. Go to **supabase.com** → click **Start your project** → sign in (GitHub login is easiest).
2. Click **New project**:
   - Organization: pick the default one
   - Name: `notiva`
   - Database Password: click **Generate a strong password** → **copy it into a note** (you need it in Part 3)
   - Region: the closest to you
   - Click **Create new project** and wait ~2 minutes.
3. In the left sidebar click the **SQL Editor** icon (`>_`), then **New query**.
4. Open the file **`supabase-setup.sql`** from this project, copy the **entire contents**, paste it into the SQL editor, and press **Run**.
   - You should see “Success. No rows returned” — that's good.
   - Check it worked: click the **Table Editor** icon (spreadsheet) in the sidebar — you should see 7 tables: `users`, `sessions`, `user_settings`, `pages`, `blocks`, `subjects`, `assessments`.
5. Get your connection string:
   - Click the **Connect** button at the very top of the page (or the gear ⚙ → **Database**).
   - Find the **Transaction pooler** string (port **6543**). It looks like:
     `postgresql://postgres.xxxxxxxx:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres`
   - Copy it into a note and replace `[YOUR-PASSWORD]` with the password from step 2. **This full line is your `DATABASE_URL`.**

You never seed data by hand — every account that signs up automatically gets the Welcome page, To-Do List, My Lists, and starter subjects.

---

## Part 2 — GitHub (home for your code)

1. Go to **github.com** → sign in (create an account if needed).
2. Click the **+** (top right) → **New repository**:
   - Name: `notiva`
   - Keep **Public** or **Private** — either works (Private is fine, your database password is NOT in the code)
   - Do **not** tick “Add a README”
   - Click **Create repository**.
3. On the empty repo page, click the link **“uploading an existing file”** (it's near the bottom of the page).
4. Drag the **whole project folder** from your computer into that upload box
   (in Chrome/Edge/Firefox you can drop an entire folder at once), but first:
   - ❌ remove / don't include `node_modules`
   - ❌ remove / don't include `.next`
   - ❌ remove / don't include `.env`
   - ✅ everything else goes in (`src`, `package.json`, `netlify.toml`, `drizzle.config.ts`, `supabase-setup.sql`, etc.)
5. Wait for the files to finish processing, then click the green **Commit changes** button.

> Prefer not to use GitHub at all? Netlify can also import a repo from GitLab or
> Bitbucket — same idea, one click each.

---

## Part 3 — Netlify (your live website)

1. Go to **app.netlify.com** → sign up (use **“Sign up with GitHub”** — links instantly).
2. Click **Add new site** → **Import an existing project**.
3. Choose **Deploy with GitHub** → authorize Netlify when GitHub asks → pick your **`notiva`** repo.
4. On the configure page, Netlify auto-detects Next.js and reads `netlify.toml` — build settings are already filled in. Don't change them.
5. **The one important step:** scroll down and click **Add environment variables** (or **Show advanced → New variable**) and add:

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | paste your full Supabase Transaction-pooler line from Part 1 |

6. Click **Deploy notiva**. Wait 2–4 minutes (watch the log if you're curious).
7. When it says **Published**, click the URL (`https://random-name.netlify.app`).
8. Optional but recommended: **Site settings → Change site name** → e.g. `notiva-you.netlify.app`.

---

## Part 4 — Use it everywhere

1. Open your site → it lands on the login screen → **Create account** with your name, email and a password (6+ characters).
2. Repeat **Create account** for anyone else who should have their own workspace — each account is completely private and separate.
3. On every other laptop you own: open the same URL → **Sign in**. Pages, to-dos, subjects, SAC scores and your theme are all synced.
4. Optional: once everyone's signed up, close the door — in Netlify go to **Site settings → Environment variables → Add a variable** → `DISABLE_SIGNUPS` = `1` → **Trigger deploy → Deploy site**. New sign-ups stop; existing users keep logging in.

## If something goes wrong

- **Deploy failed / site shows an error** → the env var is missing or mistyped. Add `DATABASE_URL`, then **Deploys → Trigger deploy → Clear cache and deploy site**.
- **Login spins forever or errors** → wrong connection string. Re-copy the **Transaction pooler** (port 6543) string and update the variable.
- **“relation does not exist” errors** → the SQL wasn't run. Do Part 1 step 3–4 again.
- **Deployed but latest changes missing** → every `git` change (or GitHub web upload) auto-triggers a fresh Netlify deploy — check the **Deploys** tab.

(If you ever *do* want the terminal: `npx drizzle-kit push` creates the same tables as `supabase-setup.sql`, using `DATABASE_URL` from `.env`.)

## Optional: connect Google Calendar

The Calendar page can show the signed-in user's **primary Google calendar** as a
read-only live overlay. Google events, including expanded recurring events, are
not copied into Notiva; local Notiva events are not sent to Google. Timed events
are shown in the browser's time zone. All-day events appear on each day they
cover; timed multi-day events appear on their start day. Use Google Calendar to
edit Google events. Refresh or change months to reload them.

1. In Google Cloud Console, create or choose a project and enable the **Google
   Calendar API**. Configure the OAuth consent screen (add test users while the
   app is in testing), requesting the `https://www.googleapis.com/auth/calendar.readonly`
   scope. Production/public use may require Google verification.
2. Create a **Web application** OAuth client. Add the exact redirect URI
   `https://YOUR-SITE/api/google-calendar/callback` (for local development,
   `http://localhost:3000/api/google-calendar/callback`).
3. Set these environment variables on your hosting provider and redeploy:

   | Key | Value |
   |---|---|
   | `GOOGLE_CLIENT_ID` | OAuth client ID |
   | `GOOGLE_CLIENT_SECRET` | OAuth client secret |
   | `GOOGLE_REDIRECT_URI` | Exact redirect URI registered above, using the canonical site origin |
   | `GOOGLE_TOKEN_ENCRYPTION_KEY` | A persistent, random 32-byte key encoded as 64 hexadecimal characters (generate with `openssl rand -hex 32`) |

   Keep the client secret and encryption key private. Back up the key securely:
   changing it makes existing connections unreadable and users must reconnect.
   Each deployment origin needs its own matching redirect URI configuration.
4. Run the `google_calendar_connections` table statement at the end of
   `supabase-setup.sql` in your existing database (or run `npx drizzle-kit push`).
   Then sign in to Notiva, open Calendar and select **Connect Google Calendar**.
   Disconnect removes the stored credential and attempts to revoke it at Google.
   If revocation fails while Google is unreachable, revoke access in your Google
   account's third-party connections too.
