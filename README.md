# RoofView Demo Co

A full-stack demo application showing how **Git**, **Neon (PostgreSQL)**, and **Netlify** work together to build and deploy a real web app.

Built by Adam Capps as a walkthrough for Eric White.

---

## What This App Does

RoofView Demo Co is a (fake) business that builds scaled model replicas of commercial roofs for property owners, training programs, and investor presentations. The app is a project management system where you can:

- **Login** with a single admin account (protected by session-based auth)
- **Dashboard** — view all projects with stats (total, in progress, completed, revenue), filter by status, search by name
- **Create / Edit / Delete** projects with full details
- **Project Detail** — view individual projects, upload photos and documents, see status timeline
- **Analytics** — charts showing revenue over time, project status breakdown, roof type distribution, trends
- **Client Portal** — shareable public link for clients to check their project status (no login needed)
- All data persists in a real PostgreSQL database
- Files stored in Netlify Blobs

---

## The Stack

### 1. Git (Version Control)
Tracks every change to the code. When you push code to GitHub, Netlify automatically detects the change and redeploys the site.

### 2. Neon (Database)
Cloud PostgreSQL database storing project data, session tokens, and file metadata.

### 3. Netlify (Hosting + Functions + Blobs)
Hosts the website, runs backend code (serverless functions), and stores uploaded files (Netlify Blobs).

---

## How Data Flows

```
User clicks "New Project"
        ↓
Browser sends POST to /api/projects
        ↓
Netlify routes to netlify/functions/projects.js
        ↓
Function checks auth cookie → validates session in DB
        ↓
SQL INSERT runs, row saved to Neon
        ↓
Response sent back to browser
        ↓
Table refreshes with new data
```

---

## File Structure

```
roofview-demo/
├── public/
│   ├── index.html              ← Login page
│   ├── dashboard.html          ← Admin dashboard (project list, CRUD)
│   ├── project.html            ← Project detail (files, status timeline)
│   ├── analytics.html          ← Charts and metrics
│   ├── portal.html             ← Client portal (public, no auth)
│   ├── css/
│   │   ├── shared.css          ← Design tokens, reset, shared components
│   │   ├── dashboard.css       ← Dashboard-specific styles
│   │   ├── project.css         ← Project detail styles
│   │   ├── analytics.css       ← Chart layout
│   │   ├── portal.css          ← Client portal styles
│   │   └── login.css           ← Login page styles
│   └── js/
│       ├── shared.js           ← API helpers, auth, toast, nav
│       ├── dashboard.js        ← Dashboard logic
│       ├── project.js          ← Project detail + file uploads
│       ├── analytics.js        ← Chart rendering (Chart.js)
│       ├── portal.js           ← Client portal logic
│       └── login.js            ← Login form
├── netlify/
│   └── functions/
│       ├── projects.js         ← Projects CRUD API
│       ├── auth.js             ← Login, session check, logout
│       ├── files.js            ← File upload/download (Netlify Blobs)
│       ├── analytics.js        ← Aggregated business metrics
│       ├── portal-api.js       ← Public project status for clients
│       └── lib/
│           └── auth-check.js   ← Shared session validation helper
├── db-setup.sql                ← Database tables + seed data
├── netlify.toml                ← Netlify configuration
├── package.json                ← Node.js dependencies
├── .gitignore                  ← Files Git should ignore
└── README.md                   ← This file
```

---

## Setup Guide

### Step 1: Create a Neon Database

1. Go to [neon.tech](https://neon.tech) and sign up (free tier is plenty)
2. Create a new project
3. Copy the **connection string**
4. In the Neon SQL Editor, paste the contents of `db-setup.sql` and run it

### Step 2: Push to GitHub

```bash
cd roofview-demo
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/roofview-demo.git
git push -u origin main
```

### Step 3: Deploy on Netlify

1. Go to [netlify.com](https://www.netlify.com) and sign up / log in
2. Click **"Add new site"** → **"Import an existing project"**
3. Connect GitHub and select the repo
4. Build settings auto-detect from `netlify.toml`
5. Add environment variables:
   - `DATABASE_URL` — your Neon connection string
   - `ADMIN_USERNAME` — login username (e.g., `eric`)
   - `ADMIN_PASSWORD_HASH` — SHA-256 hash of the password

To generate the password hash, run in your terminal:
```bash
echo -n "your-password-here" | shasum -a 256
```

### Step 4: Test It

1. Visit your Netlify URL
2. Log in with your admin credentials
3. You should see the dashboard with pre-loaded projects
4. Try the analytics page, project detail pages, file uploads
5. Copy a client portal link and open it in an incognito window

---

## Environment Variables

| Variable | Description |
|----------|------------|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `ADMIN_USERNAME` | Admin login username |
| `ADMIN_PASSWORD_HASH` | SHA-256 hash of admin password |

---

## Key Concepts

| Concept | What It Means |
|---------|--------------|
| **Repository (Repo)** | The folder that Git is tracking. Contains all your code. |
| **Commit** | A saved snapshot of your code at a point in time. |
| **Push** | Sending your commits from your computer to GitHub. |
| **Serverless Function** | Backend code that runs on demand (no server to manage). |
| **Environment Variable** | A secret value stored on Netlify, not in code. |
| **Session Cookie** | A small token stored in your browser that proves you're logged in. |
| **Netlify Blobs** | File storage built into Netlify for uploads. |
| **Client Token** | A unique UUID that gives a client access to view their project. |
