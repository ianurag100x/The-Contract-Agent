# Supabase Setup Guide for The Contract Agent

This guide will walk you through setting up Supabase as the backend database for **The Contract Agent**.

---

## Step 1: Create a Free Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and log in or create a free account.
2. Click **New project**.
3. Set your **Project Name** (e.g. `the-contract-agent`) and create a secure **Database Password**.
4. Choose your preferred region and click **Create new project**.

---

## Step 2: Run the SQL Schema

1. In your Supabase project dashboard, click on the **SQL Editor** tab (icon with `>_` on the left navigation bar).
2. Click **New query**.
3. Open the file [`supabase/schema.sql`](./supabase/schema.sql) in your code editor, copy all its contents, and paste them into the Supabase SQL editor.
4. Click **Run** (green button at the bottom right).
5. You should see `Success. No rows returned`. All tables, constraints, indexes, RLS policies, and seed data are now created!

---

## Step 3: Copy Your API Keys to `.env`

1. In your Supabase dashboard, click on the **Project Settings** (gear icon) at the bottom of the sidebar.
2. Go to **API** (under Configuration).
3. Copy the following values:
   - **Project URL** (e.g., `https://abcdefghijkl.supabase.co`)
   - **anon (public)** key
   - **service_role (secret)** key *(keep this secret, it allows the backend to perform administrative database operations)*
4. Open [`server/.env`](./server/.env) and paste your keys:

```env
PORT=3001
NODE_ENV=development

# --- SUPABASE CREDENTIALS ---
SUPABASE_URL=https://abcdefghijkl.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# --- TORN API CREDENTIALS ---
TORN_API_KEY=your_torn_api_key_here
TORN_API_BASE_URL=https://api.torn.com
```

---

## Step 4: Run the Backend and Frontend

In your terminal:

```powershell
# 1. Start the Backend Server
npm run server

# 2. In a second terminal, start the Frontend Web App
npm run dev
```

The backend server will automatically detect your Supabase credentials upon startup!
