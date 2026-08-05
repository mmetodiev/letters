# Moral Letters to Lucilius

Seneca’s *Moral Letters* in modern English — a static reading site with bookmarks and notes (local, or synced with an account).

**Live:** [moral-letters.vercel.app](https://moral-letters.vercel.app) · custom domain: `letters.metodiev.com` (after DNS)

## Routes

| Path | Description |
|------|-------------|
| `/` | Intro home |
| `/letters/` | Table of contents |
| `/letters/letter-NN/` | Individual letters |
| `/bookmarks/` | Saved letters + note previews |
| `/account/` | Magic-code sign-in (InstantDB sync) |

Guests store bookmarks/notes in `localStorage` (`moral-letters-user`). Signed-in users sync via InstantDB. Export/import JSON still works from the bookmarks page.

## InstantDB setup

1. Create an app at [instantdb.com/dash](https://www.instantdb.com/dash).
2. Put the App ID in `src/_data/instant.json` (`appId`).
3. Push schema and permissions (from the repo root):

```bash
npx instant-cli login
npx instant-cli init-without-files --app <YOUR_APP_ID>   # if needed
npx instant-cli push-schema
npx instant-cli push-perms
```

Or paste `instant.schema.js` / `instant.perms.js` into the dashboard editors.

4. Enable **Magic Code** auth for the app.
5. Add allowed origins (e.g. `http://localhost:8080`, production domain).

Without an `appId`, the site still works offline; `/account/` shows that sync isn’t configured.

## Develop

```bash
npm install
npm run serve   # bundles client + http://localhost:8080
npm run build   # bundles client → output _site/
```

## Deploy

Configured for Vercel (`vercel.json`: build `npm run build`, output `_site`).

```bash
vercel --prod
```

## Stack

- [Eleventy](https://www.11ty.dev/) 3
- [InstantDB](https://www.instantdb.com/) (optional sync)
- Client sources in `client/`, bundled to `src/user-data.js` via esbuild
