# AGENTS.md — Gestion Stock & Caisse

## Stack

- **Electron + React 18 + TypeScript** via `electron-vite` (3 entrypoints: `src/main/`, `src/preload/`, `src/renderer/`)
- **Prisma + SQLite** — DB path injected dynamically at runtime in `src/main/index.ts` via `app.getPath('userData')`; `.env` is only for codegen/local dev
- **Tailwind CSS + shadcn/ui** (Radix primitives) — components in `@/components/ui` (`@` → `src/renderer/src`)
- **Zustand** for state management

## Dev commands

| Command | Purpose |
|---|---|
| `npm run dev` | Launch electron-vite dev server |
| `npm run build` | Production build |
| `npm run prisma:push` | Push schema to SQLite |
| `npm run prisma:studio` | Open Prisma Studio (DB GUI) |
| `npm run prisma:generate` | Regen Prisma client after schema change |

No lint, typecheck, or test commands configured — verified via `tsc` project references only.

## Architecture

- **IPC tunnel**: `ipcMain.handle` in main → `contextBridge.exposeInMainWorld` in preload → `window.api.*` in renderer. All Node/Electron APIs stay behind the tunnel.
- **Shared types**: `src/shared/types.ts` defines `Product`, `Sale`, `Warehouse`, `Client`, `Supplier`, `StockAlert`, `ElectronApi`, `ReceiptData`, `PurchaseOrderItem` — imported from both main and renderer.
- **Views**: `src/renderer/src/views/` — Caisse, Produits, Entrepôts, Alertes, Clients, Fournisseurs. Sidebar nav in `App.tsx`.
- **Services** (main process): `src/main/services/` receives `PrismaClient` via factory pattern.
- **Printing**: `printerService.ts` → `electron-pos-printer` for ESC/POS thermal receipts (58mm). `reportService.ts` → `pdfkit` for A4 PDF stock reports saved to desktop.
- **Stock analysis**: `stockAnalysisService.ts` scans `Stock.alertLimit`, generates purchase order PDF in `~/Desktop/bons-de-commande/`.

## Schema notes

- **UUIDs**: All model IDs are UUID strings (not auto-increment integers).
- **Product fields**: 10 inline custom fields (`field1_label`..`field10_label` + `fieldX_value`) instead of a separate model.
- **Stock table**: Many-to-many join between Product and Warehouse, with `quantity` and `alertLimit` per warehouse.
- **Sale + SaleItem**: Full POS model with subTotal/vatTotal/discount/finalTotal, linked to Client.
- **Raw SQL mirror**: `src/main/index.ts` has `CREATE TABLE IF NOT EXISTS` for every model — must stay in sync with `schema.prisma` on every field addition.

## Conventions

- **Language**: French — all UI strings, comments, error messages, and naming MUST be in French.
- **Schema changes**: update `prisma/schema.prisma`, then run `npm run prisma:generate && npm run prisma:push`.
- **Renderer alias**: `import { ... } from '@/components/ui/...'` resolves to `src/renderer/src/components/ui/...`.
- **Import shared types**: relative path `../../../shared/types` from renderer, or `../shared/types` from main/preload.

## User focus areas (current work)

- Product card management UI — creation & editing interfaces for product sheets with 10 custom fields + supplier linkage
- Barcode scanner integration via IPC tunnel (keyboard wedge / hardware scanner)
- Client CRUD with ranking (premium/fidèle/standard), invoices, total spent
- Supplier CRUD linked to products for automated purchase orders
- Stock break analysis: daily scan of `Stock.alertLimit` → generates PDF purchase order per supplier on desktop
- Thermal receipt printing via `electron-pos-printer` (ESC/POS, 58mm)
- PDF stock report export to desktop via `pdfkit`
