# FPL Helper

A web app for Fantasy Premier League managers. Enter your team ID and it shows your squad on a pitch,
the best captain options for this gameweek, and which transfers are worth making over the next few
gameweeks. It reads live data from the official FPL API, so it follows the current season.

**Live site: [fpl-helper-seven.vercel.app](https://fpl-helper-seven.vercel.app/)**

## What it does

| Page | What you get |
|---|---|
| My team | Your starting XI and bench on a pitch, next opponent coloured by difficulty, captain and injury flags, rank, points, team value and bank, and the three best captain options |
| Planner | Plans for rolling your transfer, making one, or taking a -4 hit, each scored by your best XI and captain over the next 3 or 5 gameweeks |
| Transfers | Upgrades ranked by projected gain, with the reasons (fixtures, minutes, ownership) |
| Best squad | A high-scoring 15 within £100m and three players per club |
| Players | Search every player by name or club, filter by position, and open a page with their stats and next five fixtures |

The team ID is remembered in the browser, so you enter it once and every page uses it. On phones the
pages are in a tab bar at the bottom of the screen.

## Built with

Next.js (App Router), React, TypeScript and Tailwind CSS. The app's own API routes call the public FPL
API (`https://fantasy.premierleague.com/api`) on the server, which avoids browser CORS errors, so no API
key is needed.

```text
web/app/
  api/            server routes that read the FPL API and compute projections
  _components/    app shell, pitch, cards and icons
  _state/         the team being viewed, shared by all pages
  page.tsx        team ID entry and the squad view
  plan/ transfers/ best-squad/ players/ player/[id]/
```

## Run it yourself

Requires Node.js 20 or newer.

```bash
cd web
npm install
npm run dev      # http://localhost:3000
```

To deploy your own copy, import this repository on [vercel.com](https://vercel.com), set **Root
Directory** to `web`, and deploy. No environment variables are needed.

## About the expected points

The expected-points figures are a hand-made heuristic, not a trained model. A player's FPL form and
expected goal involvements are combined, then scaled by fixture difficulty, position, minutes played
and availability (injury or doubt flags); see `web/app/api/_lib/projection.ts`. The recommendations
route also uses bookmaker match odds from football-data.co.uk (`odds.ts`). Treat the numbers as a
ranking aid, not a prediction.

This is an unofficial tool and is not affiliated with the Premier League.
