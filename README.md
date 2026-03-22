# RoofView Demo Co

A full-stack demo application showing how **Git**, **Neon (PostgreSQL)**, and **Netlify** work together to build and deploy a real web app.

Built by Adam Capps as a walkthrough for Eric White.

---

## What This App Does

RoofView Demo Co is a (fake) business that builds scaled model replicas of commercial roofs for property owners, training programs, and investor presentations. The app is a project dashboard where you can:

- View all projects with stats (total, in progress, completed, revenue)
- Filter by status and search by name
- Create new projects with full details
- Edit existing projects
- Delete projects
- All data persists in a real PostgreSQL database

---

## The Stack (3 Pieces)

### 1. Git (Version Control)
**What it does:** Tracks every change you make to the code. Think of it like "Track Changes" in Word but for code. Every save point (called a "commit") is permanent and reversible.

**In this project:** The entire codebase lives in a GitHub repository. When you push code to GitHub, Netlify automatically detects the change and redeploys the site.

### 2. Neon (Database)
**What it does:** Neon is a cloud PostgreSQL database. It stores all the project data (client names, roof types, prices, etc.) in a real database that persists between visits.

**In this project:** The `projects` table stores every record. The `netlify/functions/projects.js` serverless function talks to Neon using the `@neondatabase/serverless` library.

### 3. Netlify (Hosting + Functions)
**What it does:** Netlify hosts the website AND runs backend code (serverless functions). When someone visits the site, Netlify serves the HTML. When the app needs data, it calls a Netlify Function which talks to Neon.

**In this project:**
- `public/index.html` is the frontend (what you see)
- `netlify/functions/projects.js` is the backend (talks to the database)
- The `/api/projects` URL routes to the function automatically

---

## How Data Flows

```
User clicks "New Project"
        ↓
Browser sends POST to /api/projects
        ↓
Netlify routes to netlify/functions/projects.js
        ↓
Function connects to Neon PostgreSQL
        ↓
SQL INSERT runs, row saved
        ↓
Response sent back to browser
        ↓
Table refreshes with new data
```

---

## Setup Guide (Step by Step)

### Step 1: Create a Neon Database

1. Go to [neon.tech](https://neon.tech) and sign up (free tier is plenty)
2. Create a new project (name it "roofview-demo" or whatever you want)
3. Copy the **connection string** that looks like:
   ```
   postgresql://username:password@ep-something.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
4. In the Neon dashboard, open the **SQL Editor**
5. Paste the contents of `db-setup.sql` and run it
6. You should see the `projects` table with 8 seed records

### Step 2: Push to GitHub

1. Create a new repository on GitHub (name it `roofview-demo`)
2. In your terminal:
   ```bash
   cd roofview-demo
   git init
   git add .
   git commit -m "Initial commit - RoofView Demo Co"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/roofview-demo.git
   git push -u origin main
   ```

### Step 3: Deploy on Netlify

1. Go to [netlify.com](https://www.netlify.com) and sign up / log in
2. Click **"Add new site"** then **"Import an existing project"**
3. Connect your GitHub account and select the `roofview-demo` repo
4. Build settings should auto-detect from `netlify.toml`:
   - **Publish directory:** `public`
   - **Functions directory:** `netlify/functions`
5. Before deploying, go to **Site settings > Environment variables**
6. Add one variable:
   - **Key:** `DATABASE_URL`
   - **Value:** (paste your Neon connection string from Step 1)
7. Deploy the site

### Step 4: Test It

1. Visit your Netlify URL (something like `roofview-demo.netlify.app`)
2. You should see the dashboard with 8 pre-loaded projects
3. Try creating a new project, editing one, filtering, searching
4. Every change is saved to Neon and will persist

---

## File Structure

```
roofview-demo/
├── public/
│   └── index.html          ← The entire frontend (HTML + CSS + JS)
├── netlify/
│   └── functions/
│       └── projects.js     ← Backend API (talks to Neon)
├── db-setup.sql            ← Database table + seed data
├── netlify.toml            ← Netlify configuration
├── package.json            ← Node.js dependencies
├── .gitignore              ← Files Git should ignore
└── README.md               ← This file
```

---

## Making Changes (The Git Workflow)

After the initial setup, here is how you update the site:

```bash
# 1. Make your code changes (edit files)

# 2. See what changed
git status

# 3. Stage your changes
git add .

# 4. Commit with a message
git commit -m "Added client phone number field"

# 5. Push to GitHub
git push

# Netlify auto-detects the push and redeploys (usually takes 30-60 seconds)
```

---

## Key Concepts for Eric

| Concept | What It Means |
|---------|--------------|
| **Repository (Repo)** | The folder that Git is tracking. Contains all your code. |
| **Commit** | A saved snapshot of your code at a point in time. |
| **Push** | Sending your commits from your computer to GitHub. |
| **Serverless Function** | Backend code that runs on demand (no server to manage). |
| **Environment Variable** | A secret value (like database passwords) stored on Netlify, not in code. |
| **Connection String** | The URL that tells your code where the database lives and how to log in. |
| **Deploy** | Taking your code and making it live on the internet. |
| **SQL** | The language used to talk to databases (SELECT, INSERT, UPDATE, DELETE). |

---

## Common Commands Reference

```bash
# Git
git status              # See what files changed
git add .               # Stage all changes
git commit -m "msg"     # Save a snapshot
git push                # Send to GitHub (triggers deploy)
git log --oneline       # See commit history

# Netlify CLI (optional)
netlify dev             # Run the site locally
netlify deploy          # Manual deploy
netlify env:set KEY val # Set environment variable

# Neon
# Use the web SQL Editor at console.neon.tech
# Or connect via psql with your connection string
```
