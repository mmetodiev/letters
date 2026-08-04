# Moral Letters to Lucilius

Seneca’s *Moral Letters* in modern English — a static reading site with local bookmarks and notes.

**Live:** [moral-letters.vercel.app](https://moral-letters.vercel.app) · custom domain: `letters.metodiev.com` (after DNS)

## Routes

| Path | Description |
|------|-------------|
| `/` | Intro home |
| `/letters/` | Table of contents |
| `/letters/letter-NN/` | Individual letters |
| `/bookmarks/` | Saved letters + note previews (this device) |

Bookmarks and notes are stored in `localStorage` (`moral-letters-user`). Export/import JSON from the bookmarks page to move data between browsers.

## Develop

```bash
npm install
npm run serve   # http://localhost:8080
npm run build   # output → _site/
```

## Deploy

Configured for Vercel (`vercel.json`: build `npm run build`, output `_site`).

```bash
vercel --prod
```

## Stack

- [Eleventy](https://www.11ty.dev/) 3
- Plain HTML/CSS + a small client script (`src/user-data.js`)
