# Delusional Diary — Full desktop-first application

A desktop-first travel discovery and personal diary application inspired by the Delusional Diary reference. Includes a React + TypeScript frontend and a Node/Express API backed by MySQL, with persistent media uploads.

## Requirements

- Node.js 20+
- npm 10+

## Run the complete application

From the project root:

```bash
npm install
npm run dev:all
```

Open the Vite URL printed in the terminal (normally `http://localhost:5173`). The API runs at `http://localhost:4000`; the frontend proxies `/api` and `/uploads` to it.

If you prefer separate terminals:

```bash
# Terminal 1 — API
npm run dev:api

# Terminal 2 — frontend
npm run dev
```

API health check: `http://localhost:4000/api/health`.

## Included features

- Premium travel-themed desktop UI with collapsible sidebar, global search, notification popover, responsive layout, and parchment/navy/gold design system.
- Home dashboard, destination search, category filters, state browsing, interactive OpenStreetMap view with destination pins/popups, wishlist toggles, destination detail modal, diary, passport stamps, profile pages, and a dedicated India Directory screen.
- API-backed demo session; account registration and login API endpoints are also included.
- Persistent destinations, memories, wishlists, visits, profile details, and passport/achievement summaries.
- Create, update, and delete diary memories through the API.
- Upload image/video/audio files up to 15 MB; uploaded files are served from `/uploads`.
- Visit tracking and passport eligibility based on recorded visits, not on opening a page.
- MySQL database `travelapp`; uploaded media at `backend/uploads/`.
- Sample destination dataset to make the first launch usable.
- India directory seed containing all 28 states and 8 union territories (Tripura added to the supplied list), with 648 district entries as provided/normalized and eight illustrative image-led place records. The district seed is a starting point, not a current official gazetteer; verify and refresh it against the latest Local Government Directory (LGD) before publishing.
- `GET /api/directory` serves states, districts, and places from MySQL. The frontend keeps only directory types; directory content is not hardcoded in the source.

## API overview

- `GET /api/health`
- `POST /api/auth/demo`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/me`, `PATCH /api/me`
- `GET /api/directory`
- `GET /api/destinations`, `GET /api/destinations/:id`
- `GET /api/dashboard`, `GET /api/passport`
- `GET /api/memories`, `POST /api/memories`, `PATCH /api/memories/:id`, `DELETE /api/memories/:id`
- `POST /api/uploads`
- `GET /api/wishlist`, `POST /api/wishlist/:destinationId`
- `POST /api/visits/:destinationId`

Authenticated API calls use `Authorization: Bearer <token>`. The frontend starts with a demo explorer session for convenient local evaluation; real registration/login forms can be surfaced in the UI when account onboarding is finalized.

## Data and deployment notes

- MySQL stores users, directory data, destinations, memories, visits, friendships, sharing permissions, likes, and comments. For production, use managed MySQL and put uploads in object storage.
- Session tokens are held in server memory and reset when the API restarts; the frontend obtains a fresh demo token on launch. Use a durable session store and rate limiting before public deployment.
- Configure HTTPS, secure cookies/token storage, CSRF protections where applicable, validation, backup/retention, and production secrets before deploying publicly.
- Destination photography uses remote Unsplash image URLs for the sample cards. Confirm provider terms and use properly licensed/attributed images before a commercial release. Image metadata, source URL, and verification status should be maintained for imported destination images.
- Map coordinates are provided in destination data, but a full interactive map tile experience is not included in this initial complete baseline.

## Production build

```bash
npm run build
```

The generated frontend is placed in `dist/`. Run the API separately using `npm start` (from the project root). Configure your production web server to route `/api` and `/uploads` to the API service.

## Desktop UI redesign
- Home now contains one cinematic hero image and a single primary action that opens the India Directory.
- Removed Explore and Passport from the primary navigation and removed the Passport page from the app flow.
- The India Directory is image-led: select a state card, then choose a district from the district explorer. The illustrated map is decorative and clearly marked as not for navigation; verified state/district boundary geometry can be connected later.
- Diary cards use a memory-journal visual treatment, and the profile page has an expanded scenic cover and editorial layout.
- The state/district directory remains a starter seed; verify official district lists and populate attraction data before production use.

## UI redesign v2 (Roamly)
- Brand renamed in the UI to **Roamly** (change in `src/App.tsx`, `index.html` and the footer if the client wants another name).
- New design system in `src/styles.css`: warm paper background, forest-green brand, saffron/coral accents, Fraunces + Plus Jakarta Sans fonts.
- Sidebar replaced by a floating top navigation (mobile: bottom tab bar). Pages: Home, Explore (directory), Diary, Profile.
- Home: full-bleed hero with search, mood tiles, trending places scroller, diary prompt.
- Current location: the location chip in the header asks for browser permission, shows your city, shows "km from you" on every place with coordinates, and pre-fills the starting point in the directions map.
- No backend or data changes.
