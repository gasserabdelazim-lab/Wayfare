# Wayfare — setup

## Private accounts and secure trip membership

Wayfare requires each person to sign in. Trips, activities, votes, comments,
expenses, and settlements are protected by Supabase Row Level Security and are
only readable by authenticated trip members. Owners invite friends with an
expiring tokenized link; knowing a trip UUID alone does not grant access.

Everything here is real, working code. These are the few things only you can do
(account creation), each takes a couple of minutes.

## 1. Database — Supabase (free)

1. Go to supabase.com, sign up, click "New project".
2. Once it's created, open the **SQL Editor** (left sidebar) → New query.
3. Paste the entire contents of `supabase/schema.sql` and click Run.
4. Apply every file in `supabase/migrations` in filename order. Existing
   installations only need migrations they have not applied yet.
5. Go to **Project Settings → API**. You'll need two values from here in step 3 below:
   - **Project URL**
   - **anon public** key

## 2. Authentication — email and Google

Email/password authentication works through Supabase Auth. To enable Google:

1. Create a Web OAuth client in Google Cloud.
2. Set its authorized redirect URI to your Supabase Auth callback URL:
   `https://<project-ref>.supabase.co/auth/v1/callback`
3. In **Supabase → Authentication → Providers → Google**, enable Google and
   enter the client ID and client secret.
4. In **Supabase → Authentication → URL Configuration**, set the production
   Site URL and allow the production and local development redirect URLs.

## 3. Push this code to GitHub

1. Create a new repo on github.com (can be private).
2. From this folder:
   ```
   git init
   git add .
   git commit -m "Wayfare v1"
   git remote add origin <your repo URL>
   git push -u origin main
   ```

## 4. Deploy — Vercel (free)

1. Go to vercel.com, sign up with your GitHub account.
2. Click "New Project", import the repo you just pushed.
3. Before deploying, add two environment variables (Vercel will prompt you):
   - `NEXT_PUBLIC_SUPABASE_URL` → the Project URL from step 1
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → the anon public key from step 1
4. Click Deploy. In about a minute you'll get a real URL like `wayfare-xyz.vercel.app`.

## That's it

Open the URL and sign in, then create a trip. Invite friends with the secure
link; each friend signs in with their own account before joining. Activities,
votes, costs, and settlements sync live across the group’s phones.

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
