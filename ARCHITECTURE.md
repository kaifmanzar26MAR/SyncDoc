# SyncDoc — System Architecture

## 1. Routing Model

SyncDoc uses **Next.js Pages Router** with file-based routing under `src/pages/`. All API endpoints live in `src/pages/api/`. Feature code is organized into **domain modules** under `src/modules/`.

```
src/pages/                          → File-based routes
src/pages/api/                      → REST API handlers
src/modules/shared/                 → Cross-cutting code
src/modules/dashboard/              → Dashboard domain
src/modules/document/               → Document editor domain
src/modules/auth/                   → Authentication domain
```

---

## 2. Folder Structure

```
syncdoc/
├── middleware.js
├── server.js
├── src/
│   ├── pages/
│   │   ├── _app.js                 # Root providers, global CSS
│   │   ├── _document.js            # HTML shell, SEO, structured data
│   │   ├── index.js                # Redirect to dashboard/login
│   │   ├── login/index.js
│   │   ├── register/index.js
│   │   ├── dashboard/index.js      # SSR via DashboardPageLoader
│   │   ├── workspace/[workspaceId]/document/[documentId]/index.js
│   │   └── api/
│   │       ├── auth/[...nextauth].js
│   │       ├── auth/register.js
│   │       ├── auth/verify-otp.js
│   │       ├── workspaces/index.js
│   │       ├── documents/index.js
│   │       ├── documents/[id]/index.js
│   │       ├── documents/[id]/sync.js
│   │       ├── documents/[id]/versions/index.js
│   │       └── documents/[id]/versions/[versionId]/restore.js
│   ├── styles/globals.css
│   └── modules/
│       ├── shared/
│       │   ├── components/         # Editor, sync, collaboration, layouts
│       │   ├── data/
│       │   │   ├── models/         # Mongoose schemas (all collections)
│       │   │   └── services/       # workspace.service, document.service
│       │   ├── lib/
│       │   │   ├── auth/
│       │   │   ├── db/             # mongoose + dexie
│       │   │   ├── sync-engine/
│       │   │   ├── security/
│       │   │   └── validations/
│       │   ├── providers/
│       │   ├── stores/
│       │   └── utils/              # session, api-response, api-auth
│       ├── dashboard/
│       │   ├── components/       # DashboardShell
│       │   ├── hooks/
│       │   ├── views/              # DashboardView
│       │   └── data/
│       │       ├── loader/         # DashboardPageLoader.js (getServerSideProps)
│       │       └── service/        # DashboardApis.js (client fetch)
│       ├── document/
│       │   ├── components/         # DocumentShell
│       │   ├── hooks/              # useSyncEngine, usePresence
│       │   ├── views/
│       │   └── data/
│       │       ├── loader/         # DocumentPageLoader.js
│       │       └── service/        # DocumentApis.js
│       └── auth/
│           ├── views/              # LoginView, RegisterView
│           └── data/
│               └── service/        # AuthApis.js
```

### Path Aliases (`jsconfig.json`)

| Alias | Path |
|---|---|
| `@/*` | `./src/*` |
| `@shared/*` | `./src/modules/shared/*` |
| `@dashboard/*` | `./src/modules/dashboard/*` |
| `@document/*` | `./src/modules/document/*` |
| `@auth-module/*` | `./src/modules/auth/*` |

---

## 3. SSR Data Loading Pattern

Each page delegates server-side data fetching to a **PageLoader** in its module:

```javascript
// src/pages/dashboard/index.js
import { loadDashboardPage } from '@dashboard/data/loader/DashboardPageLoader';
export const getServerSideProps = loadDashboardPage;
```

```javascript
// DashboardPageLoader.js
export async function loadDashboardPage(context) {
  const session = await getPageSession(context.req);
  const workspaces = await getWorkspacesForUser(session.user.id);
  return { props: { session, workspaces } };
}
```

Client-side mutations use **module Api services** (`DashboardApis.js`, `AuthApis.js`).

---

## 4. Layout Architecture

| Layout | Where | Responsibility |
|---|---|---|
| `_document.js` | Pages | HTML, meta, OpenGraph, JSON-LD |
| `_app.js` | Pages | Theme, Auth, Global State providers |
| `DashboardShell` | `dashboard/components` | Sidebar, nav, sync status (via `getLayout`) |
| `DocumentShell` | `document/components` | Editor toolbar, presence, version drawer |

```javascript
// Per-page layout via getLayout
DashboardPage.getLayout = (page) => (
  <DashboardShell initialWorkspaces={page.props.workspaces}>{page}</DashboardShell>
);
```

---

## 5. Sync Engine, Database, Security

Unchanged from prior architecture — all live in `@shared/lib/sync-engine`, `@shared/data/models`, `@shared/lib/security`.

See sections 4–13 in the original design for ER diagrams, sync flows, authorization matrix, and deployment notes.

---

## 6. API Route Convention

Pages Router handlers use `req`/`res`:

```javascript
export default async function handler(req, res) {
  if (req.method === 'GET') { ... }
  return res.status(405).json({ error: 'Method not allowed' });
}
```

Session validation: `requireApiSession(req, res)` from `@shared/utils/api-auth`.
