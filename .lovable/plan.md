

# Self-Hosting Frontend on Hostinger with Lovable Cloud Backend

## What This Means

Your setup will be:
- **Frontend** (the website users see): hosted on Hostinger at `www.alllogisticscargo.com`
- **Backend** (database, edge functions, auth, API): stays on Lovable Cloud — you continue editing and fixing code here in Lovable, then push updates to Hostinger

## How It Works

```text
┌─────────────────────┐         ┌──────────────────────┐
│  www.alllogistics    │  API    │   Lovable Cloud      │
│  cargo.com           │ ◄─────► │   (Backend)          │
│  (Hostinger)         │         │   - Database         │
│  Static frontend     │         │   - Edge Functions   │
│  built from Lovable  │         │   - Auth             │
└─────────────────────┘         │   - Storage          │
                                └──────────────────────┘
```

## Step-by-Step Setup

### 1. Connect GitHub to Lovable
- Go to **Project Settings → Connectors → GitHub** and sync your project to a GitHub repository
- Every change you make in Lovable will be pushed to GitHub automatically

### 2. Build the Frontend Locally (or via CI)
- Clone your GitHub repo
- Run:
  ```
  npm install
  npm run build
  ```
- This produces a `dist/` folder containing static HTML/CSS/JS files
- You need to set these environment variables before building:
  - `VITE_SUPABASE_URL` = `https://sikosqmgmwvdmxzigjpl.supabase.co`
  - `VITE_SUPABASE_PUBLISHABLE_KEY` = your anon key (already in `.env`)
  - `VITE_SUPABASE_PROJECT_ID` = `sikosqmgmwvdmxzigjpl`

### 3. Upload to Hostinger
- Upload the contents of the `dist/` folder to your Hostinger web root (usually `public_html/`)
- You can do this via Hostinger File Manager or FTP

### 4. Configure SPA Routing on Hostinger
Since this is a single-page app with client-side routing, you need an `.htaccess` file in the web root so page refreshes and deep links work:

```
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

I will create this file in the `public/` folder so it is included automatically in every build.

### 5. No Backend Changes Needed
- The backend URL stays the same (`sikosqmgmwvdmxzigjpl.supabase.co`)
- Edge functions, database, auth, and webhooks all remain unchanged
- The Evergreen webhook URL stays the same

## Workflow Going Forward

1. Fix or add features in Lovable (code auto-syncs to GitHub)
2. Pull from GitHub, run `npm run build`
3. Upload the new `dist/` folder to Hostinger
4. Backend changes (edge functions, database) deploy instantly from Lovable — no Hostinger update needed

## What I Will Implement

1. **Create `public/.htaccess`** — SPA fallback routing for Apache (Hostinger uses Apache)
2. **Create `public/_redirects`** — fallback for Netlify-style hosts (optional safety net)

This is a minimal change — the app code stays identical; only deployment routing config is added.

