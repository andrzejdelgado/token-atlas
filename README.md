# Token Atlas

**Token Atlas** is a web-based management layer for semantic design tokens in multi-brand design systems. It sits alongside Figma — not as a plugin, but as a full application — giving design and engineering teams the filtering, bulk operations, history tracking, and cross-platform sync that Figma's Variables panel doesn't provide.

Built as a production-grade case study demonstrating SaaS architecture, Figma Variables API integration, W3C Design Tokens standard, and a component-driven UI with ShadCN.

---

## The Problem

Figma's Variables panel has no filtering, no contextual search, and no bulk actions. Once a design system grows past a few hundred semantic tokens, it becomes impossible to manage inside Figma alone. Token Atlas solves this with a dedicated interface that treats tokens as data — queryable, auditable, and portable.

---

## Key Features

### Token Management
- Collapsible grouped table with infinite scroll
- Inline rename by double-clicking a token name
- Per-token flag for "needs review", with optimistic UI toggle
- Full edit sheet: name, type, values, group, themes, labels, components
- Per-token audit log — every change, who made it, before/after values

### Theme Overrides
- **Light and Dark are not themes** — every token carries both values always
- **Themes are brands** — orthogonal to the collection/group hierarchy
- Switch between base theme and modifier themes; override Light/Dark values per brand without touching the base token
- Override indicator in value columns; overflow themes tuck into a `+N` popover

### Bulk Operations
- Select any number of tokens; floating action toolbar appears at the bottom
- Bulk rename with prefix, suffix, swap, or remove — live highlighted preview
- Bulk move, group, flag, label, and delete with popover confirmation

### Groups
- Infinite-depth group hierarchy within each collection
- Inline subgroup creation and rename from the sidebar
- Delete with child-promotion logic: direct children are promoted to top-level, tokens can be rehomed or deleted

### Filtering & Search
- Filter by type, group, theme, flagged status, label, component, or date range
- Advanced Search page with always-visible filters and saved query history
- Column manager: show/hide and reorder columns; Name column locked first

### Connectors
- **Figma Variables** — push tokens as native Figma Variables via the Variables API (open beta); scoped per brand theme
- **Storybook** (admin only) — commit a W3C `tokens.json` to a GitHub repo via Octokit; triggers Storybook rebuild if CI is configured

### Import / Export
- Import W3C Design Tokens JSON with preview and conflict warnings
- Export scoped by theme, collection, or group

### Access Control
- Two roles: **Admin** (full access including Storybook push, settings, user management) and **User** (token operations only)
- Role enforced server-side on every API route — UI hiding is supplemental only

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, Server Components) |
| Language | TypeScript (strict mode) |
| Database | MongoDB Atlas via Mongoose |
| Auth | NextAuth.js v5 — Credentials + Google OAuth |
| Styling | Tailwind CSS v4 |
| Components | ShadCN/UI (never modified at source) |
| Figma sync | Figma Variables API (open beta) |
| Storybook sync | GitHub API via Octokit |
| Token standard | W3C Design Tokens Community Group format |
| Testing | Vitest + React Testing Library, Playwright |
| CI | GitHub Actions |

---

## Data Model

```
Collection (fixed: Foundations | Text)
  └── Group (infinite depth)
        └── Token
              ├── lightValue   ← always present, not a theme
              ├── darkValue    ← always present, not a theme
              └── themes[]     ← brand associations (orthogonal to hierarchy)

ThemeOverride
  ├── theme  → Theme
  ├── token  → Token
  ├── lightValue (optional override)
  └── darkValue  (optional override)
```

Themes represent brands. A token belongs to one or more brands. Pushing to Figma for a specific brand filters to that brand's tokens and applies any overrides before building the Variables payload.

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/              # Login and register pages
│   ├── (dashboard)/         # All authenticated pages
│   │   ├── page.tsx         # Home / dashboard
│   │   ├── tokens/          # All Semantics (token table)
│   │   ├── search/          # Advanced Search
│   │   ├── connectors/      # Figma + Storybook connectors
│   │   ├── import/          # Import flow
│   │   ├── export/          # Export flow
│   │   └── settings/        # Settings (admin)
│   └── api/                 # API routes
│       ├── tokens/          # CRUD, bulk, history, overrides
│       ├── groups/          # CRUD with child-promotion
│       ├── themes/          # CRUD
│       ├── figma/           # Push to Figma Variables
│       ├── storybook/       # Push to GitHub (admin only)
│       ├── import/          # W3C token import
│       ├── export/          # W3C token export
│       ├── notifications/   # Activity feed
│       └── settings/        # Workspace config
├── components/
│   ├── layout/              # Sidebar, page header, user menu
│   ├── tokens/              # Token table, sheets, toolbar
│   └── ui/                  # ShadCN components
├── lib/
│   ├── db/                  # Mongoose models + seed
│   ├── figma/               # Figma API client + mapper
│   └── storybook/           # W3C formatter + GitHub push
└── types/                   # Shared TypeScript interfaces
```

---

## Getting Started

### Prerequisites

- Node.js 18.17+
- MongoDB Atlas cluster (free M0 tier works)
- npm or pnpm

### 1. Clone and install

```bash
git clone https://github.com/andrzejdelgado/token-atlas.git
cd token-atlas
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env.local` and fill in the required values:

```bash
cp .env.example .env.local
```

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | Yes | MongoDB Atlas connection string |
| `NEXTAUTH_SECRET` | Yes | Random secret — `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Yes | `http://localhost:3000` in development |
| `GOOGLE_CLIENT_ID` | Optional | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Optional | Google OAuth client secret |

### 3. Seed the database

The app seeds two fixed Collections (Foundations, Text) on first run. To load example tokens:

```bash
npx tsx scripts/seed-variables.ts
```

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Connectors Setup

### Figma Variables

1. Generate a Figma Personal Access Token with `file_variables:read` and `file_variables:write` scopes
2. Get your Figma file key from the file URL: `figma.com/design/**FILE_KEY**/...`
3. In Token Atlas → Settings → Figma: enter both values and test the connection
4. In Connectors → Figma: select a brand theme and push

### Storybook (admin only)

1. Generate a GitHub Personal Access Token with `repo` scope
2. In Settings → Storybook: enter the token, repo URL, branch, and token file path
3. In Connectors → Storybook: push — a `tokens.json` (W3C format) is committed to your repo

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Production server |
| `npm run lint` | ESLint |
| `npm run test` | Unit tests (Vitest) |
| `npm run test:coverage` | Unit tests with coverage |
| `npm run e2e` | Playwright E2E tests |
| `npm run e2e:ui` | Playwright with interactive UI |
| `npm run prettier:fix` | Format all files |

---

## Roles

| Capability | Admin | User |
|---|---|---|
| Token CRUD and bulk operations | ✓ | ✓ |
| Import and Export | ✓ | ✓ |
| Push to Figma | ✓ | ✓ |
| View Settings | ✓ | ✓ (read-only) |
| Push to Storybook | ✓ | — |
| Manage Figma / GitHub credentials | ✓ | — |
| Invite, remove, and change user roles | ✓ | — |

---

## Design Decisions

**ShadCN components are never modified at source.** Customisation happens through composition, props, and slots. This keeps the codebase upgradeable and demonstrates discipline over cleverness.

**Light and Dark are values, not themes.** Every token always carries both `lightValue` and `darkValue`. Themes are brand associations — pushing to Figma for a brand filters to that brand's tokens only. Conflating modes with brands was the first architectural decision that prevented a class of export bugs.

**Admin-only actions enforced at the API layer.** Server-side role checks in every protected route handler. UI hiding is supplemental.

---

## License

MIT
