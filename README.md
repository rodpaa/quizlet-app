# Quizlet Study App

A browser-based study app with flashcards, written and multiple-choice tests,
matching exercises, and PHI 2010 argument reconstruction drills.

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
