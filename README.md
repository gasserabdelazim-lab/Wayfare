# Wayfare — setup

Everything here is real, working code. These are the few things only you can do
(account creation), each takes a couple of minutes.

## 1. Database — Supabase (free)

1. Go to supabase.com, sign up, click "New project".
2. Once it's created, open the **SQL Editor** (left sidebar) → New query.
3. Paste the entire contents of `supabase/schema.sql` and click Run.
4. Go to **Project Settings → API**. You'll need two values from here in step 3 below:
   - **Project URL**
   - **anon public** key

## 2. Push this code to GitHub

1. Create a new repo on github.com (can be private).
2. From this folder:
   ```
   git init
   git add .
   git commit -m "Wayfare v1"
   git remote add origin <your repo URL>
   git push -u origin main
   ```

## 3. Deploy — Vercel (free)

1. Go to vercel.com, sign up with your GitHub account.
2. Click "New Project", import the repo you just pushed.
3. Before deploying, add two environment variables (Vercel will prompt you):
   - `NEXT_PUBLIC_SUPABASE_URL` → the Project URL from step 1
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → the anon public key from step 1
4. Click Deploy. In about a minute you'll get a real URL like `wayfare-xyz.vercel.app`.

## That's it

Open the URL, create a trip, share the link with your family. Everyone who
opens it types their name once, then votes/adds costs/adds activities —
it all syncs live across everyone's phones.

## Optional — custom domain

In Vercel, Project → Settings → Domains, add a domain you own (~$10-15/year
from any registrar like Namecheap or Google Domains) and follow the DNS steps
Vercel shows you.

## Local development (optional)

If you want to run it on your own machine first:
```
npm install
cp .env.local.example .env.local   # then fill in your Supabase values
npm run dev
```
Opens at localhost:3000.
