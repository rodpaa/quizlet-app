# Quizlet Study App

A browser-based study app with user accounts, public and private flashcard
libraries, written and multiple-choice tests, matching exercises, and PHI 2010
argument reconstruction drills.

## Live Site

After GitHub Pages is enabled, the app is available at:

https://rodpaa.github.io/quizlet-app/

## Requirements

- Node.js 22.12 or newer
- npm (included with Node.js)

## Run Locally

```bash
npm ci
npm run dev
```

Open the local URL printed by Vite, normally `http://localhost:5173/`.

Without Supabase environment variables the app runs in local demo mode. Demo
sets remain in the current browser and are not shared online.

## Accounts and Cloud Sets

The production account and privacy model uses Supabase Auth, Postgres, and Row
Level Security.

1. Create a Supabase project.
2. Open the SQL editor and run
   `supabase/migrations/20260707000000_user_flashcard_sets.sql`.
3. Copy `.env.example` to `.env.local` and add the project URL and publishable
   anon key.
4. In Supabase Auth URL Configuration, add the local URL and the deployed
   GitHub Pages URL as allowed redirect URLs.
5. Restart `npm run dev`.

For GitHub Pages, add these repository variables under **Settings > Secrets and
variables > Actions > Variables** before deploying:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

The deployment workflow injects them into the Vite production build. Use only
the browser-safe publishable key; never add a Supabase secret key to GitHub.

Only owners can read private sets. Public sets are readable by signed-out users,
and only an owner can create, edit, or delete their sets.

## Commands

```bash
npm run dev      # Start the local development server
npm run lint     # Check the source code
npm run build    # Create the production build in dist/
npm run preview  # Preview the production build locally
npm run check    # Run lint and production build checks
```

## Study Content

Flashcards and argument data are stored in `src/data/sets.js`. The interface is
split into reusable components under `src/components/`.

## Publish With GitHub Pages

The workflow in `.github/workflows/deploy-pages.yml` checks and publishes the
app whenever a commit is pushed to `main`.

1. Push this repository to GitHub.
2. Open the repository's **Settings > Pages**.
3. Under **Build and deployment**, choose **GitHub Actions** as the source.
4. Open the **Actions** tab and wait for `Deploy to GitHub Pages` to finish.
5. Visit `https://rodpaa.github.io/quizlet-app/`.

The Vite production base path is configured for the repository name
`quizlet-app`. Update `base` in `vite.config.js` if the GitHub repository is
renamed.
