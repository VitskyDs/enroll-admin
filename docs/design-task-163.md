# Design — TASK-163: dedicated recent-transactions page

Route: **`/owner/activity`**

Rationale: the dashboard already calls this section "Recent activity" (`admin.dashboard.recentActivity`), so the drill-down page keeps the same noun instead of introducing "transactions" as a second vocabulary for the same data. `/owner/transactions` was considered and rejected only to avoid a naming split with the card title — implementer should feel free to alias if product prefers, but translation keys below assume `activity`.

---

## 1. UX overview

- **Audit-log mental model, not CRM.** This screen is a flat, reverse-chronological ledger of every `point_transactions` row for the business — across all customers — not a customer-centric view. It answers "what happened recently" rather than "who is this customer." Drilling into a specific customer still happens via the existing `CustomerDetailPanel`/`CustomerDetailDrawer`, reused here, not rebuilt.
- **Drill-down page, not a primary nav item.** Reached only via the dashboard's "view all" link (and a back-link on the page itself). It does not get a new sidebar entry in `owner-layout.tsx` — doc-11's core sections list stays as-is (Home, Customers, Program, Products, Catch up, Settings); adding a permanent nav slot for a log view is out of scope for this task and would compete with Customers for attention.
- **Server-side cursor pagination, not client-side slicing.** `Customers.tsx`'s `useOwnerCustomers` hook fetches the *entire* customer list once and paginates in memory — acceptable because customer count is bounded. Point transactions are not bounded the same way (every purchase, redemption, gift, birthday bonus, etc. is a row, forever), so this screen must page at the query level (`.range()` / keyset cursor on `created_at, id`) and append pages, never load the full table.
- **Same visual language as Customers.tsx.** Desktop table + mobile card list, "load more" button pattern (not silent infinite scroll) for consistency with the one paginated list that already exists in this app, `NativeSelect` filters, `Input` search — no new list-chrome components invented.
- **Row click opens the existing customer detail panel.** Clicking a row's customer name opens `CustomerDetailPanel` (desktop right drawer) / `CustomerDetailDrawer` (mobile bottom drawer) for that customer — the same components `Customers.tsx` already uses — so "I want to see everything about this person" is always one click away without leaving the activity page.
- **RTL-aware.** This codebase renders Hebrew (`he-IL` date formatting, `text-right` table headers, `ChevronLeft` used as the "forward/view all" affix). The wireframes below are drawn LTR for readability but the implementer should mirror `Customers.tsx`'s existing RTL conventions (text alignment, icon direction, "back" link on the correct side), not introduce a new LTR-only layout.

---

## 2. Screen inventory

| # | Screen / state | Purpose |
|---|---|---|
| 1 | Activity list — loaded | Default state: paginated ledger of point_transactions for the business |
| 2 | Activity list — loading | Initial skeleton while the first page fetches |
| 3 | Activity list — empty (no transactions at all) | Business has zero point_transactions ever |
| 4 | Activity list — empty (filtered to zero) | Filters/search produced no matches |
| 5 | Activity list — error | Query failed |
| 6 | Activity list — loading more | "Load more" button in a busy state while the next page fetches |
| 7 | Customer detail drawer (reused, not new) | Opened by clicking a row's customer name |
| 8 | Dashboard `RecentActivityCard` (modified) | "View all" now points to `/owner/activity` instead of `/owner/customers` |

---

## 3. ASCII wireframes

### 3.1 Desktop — loaded state

```
┌───────────────────────────────────────────────────────────────────────────┐
│ ← back to dashboard                                                        │
│                                                                             │
│ Recent activity                                                            │
│ All point transactions across your customers                              │
│                                                                             │
│ ┌───────────────────────────┐ [Type: all ▾] [Range: all time ▾]           │
│ │ 🔍 search by customer name│                                             │
│ └───────────────────────────┘                                             │
├───────────────────────────────────────────────────────────────────────────┤
│  customer            type                 amount        date              │
├───────────────────────────────────────────────────────────────────────────┤
│  (●) dana levi        purchase             +42 pts       jul 18, 2026 14:32│
│  (●) yossi cohen       redemption          −150 pts      jul 18, 2026 12:05│
│  (●) dana levi        birthday bonus       +50 pts       jul 17, 2026 09:14│
│  (●) maya azulay      manual gift          +20 pts       jul 16, 2026 18:40│
│  (●) ...                                                                   │
├───────────────────────────────────────────────────────────────────────────┤
│                         [ Button: "load more" ]                            │
│                    showing 50 of 640 transactions                          │
└───────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Mobile — loaded state (card list, ≤390px)

```
┌───────────────────────────┐
│ ← back                    │
│ Recent activity            │
│                            │
│ [ 🔍 search customer... ] │
│ [type ▾]     [range ▾]    │
├───────────────────────────┤
│ (●) dana levi              │
│     purchase · +42 pts     │
│     jul 18, 2026 14:32     │
├───────────────────────────┤
│ (●) yossi cohen             │
│     redemption · −150 pts  │
│     jul 18, 2026 12:05     │
├───────────────────────────┤
│ (●) ...                    │
├───────────────────────────┤
│  [ Button: "load more" ]   │
│  showing 50 of 640         │
└───────────────────────────┘
```

### 3.3 Loading (initial skeleton — desktop, same shape on mobile)

```
┌───────────────────────────────────────────────────────────────────────────┐
│ ← back to dashboard                                                        │
│ Recent activity                                                            │
│ [skeleton input] [skeleton select] [skeleton select]                       │
├───────────────────────────────────────────────────────────────────────────┤
│  ░ ░░░░░░░░░░░░        ░░░░░░░░░░       ░░░░░░       ░░░░░░░░░░░░░░       │
│  ░ ░░░░░░░░░░░░        ░░░░░░░░░░       ░░░░░░       ░░░░░░░░░░░░░░       │
│  ░ ░░░░░░░░░░░░        ░░░░░░░░░░       ░░░░░░       ░░░░░░░░░░░░░░       │
│  ░ ░░░░░░░░░░░░        ░░░░░░░░░░       ░░░░░░       ░░░░░░░░░░░░░░       │
│  (× 8 rows, pulse animation — same Skeleton() helper used elsewhere)       │
└───────────────────────────────────────────────────────────────────────────┘
```

### 3.4 Empty state (no transactions yet)

```
┌───────────────────────────────────────────────────────────────────────────┐
│ ← back to dashboard                                                        │
│ Recent activity                                                            │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                          [ Clock icon, muted, large ]                      │
│                                                                             │
│                    "no activity yet — transactions will                    │
│                     show up here once customers start                     │
│                     earning or redeeming points"                          │
│                                                                             │
└───────────────────────────────────────────────────────────────────────────┘
```

### 3.5 Empty state (filters produced zero results) — inline, list area only

```
├───────────────────────────────────────────────────────────────────────────┤
│                          [ Search icon, muted ]                            │
│                    "no transactions match your filters"                    │
│                         [ link: "clear filters" ]                          │
└───────────────────────────────────────────────────────────────────────────┘
```

### 3.6 Error state — inline, list area only

```
├───────────────────────────────────────────────────────────────────────────┤
│                       [ AlertTriangle icon, destructive ]                  │
│                  "couldn't load recent activity"                          │
│                        [ Button: "try again" ]                            │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Component mapping

| Region | Component | Notes |
|---|---|---|
| Back link | plain `Link` (react-router) + `ArrowRight`/`ChevronRight` icon (RTL-correct direction, mirror `Customers.tsx`/`RecentActivityCard` icon convention) | Text: "back to dashboard", routes to `/owner/dashboard` |
| Page title + subtitle | plain `h1`/`p`, same classes as `OwnerCustomers`'s `<h1 className="text-xl font-semibold">` header block | No new `PageHeader`-style component needed — `Customers.tsx` doesn't use one either; stay consistent |
| Search input | `Input` (`@vitskyds/enroll-ui`) + `Search` icon overlay | Same pattern as `Customers.tsx`'s search box — 200ms debounce, filters by customer name |
| Type filter | `NativeSelect` (local pattern already defined inline in `Customers.tsx` — lift to a shared local component, e.g. `src/components/owner/native-select.tsx`, since this is the second page needing it) | Options: all types / earned (purchase, referral, birthday bonus, manual gift, catch-up gift, punch card, subscription) / redeemed (redemption) — or list every `reason` value individually if the owner needs finer granularity; recommend the earned/redeemed grouping for a v1, matching the dashboard card's binary `activityLabel` treatment |
| Date range filter | `NativeSelect` | Options: all time / last 7 days / last 30 days / last 90 days — mirrors `Customers.tsx`'s `LastVisitFilter` exactly |
| Desktop table | plain `<table>` markup, same structure/classes as `CustomerRow`'s table in `Customers.tsx` (`hidden md:table`, `border-b`, `bg-muted/30` header row) | Columns: customer · type · amount · date |
| Customer cell | `Avatar` pattern from `Customers.tsx` (initials circle) + name, clickable to open detail panel | Reuse the exact `initials()` + circle markup already duplicated across `Dashboard.tsx`, `Customers.tsx`, `customer-detail-panel.tsx` — do not add a 4th copy; if convenient, extract to a shared local `Avatar` component during implementation (nice-to-have, not required for this task) |
| Type cell | plain text via a shared `reasonLabel(t, reason)` helper (already exists in `customer-detail-panel.tsx`) | Move/import rather than re-implement — same i18n keys (`history.reason.*`, `admin.customerDetail.reasonManualGift`, etc.) |
| Amount cell | plain `<span>`, green/`text-emerald-600` for positive, red/`text-red-500` for negative, tabular-nums, `+`/`−` prefix | Exact styling already used in `customer-detail-panel.tsx`'s transaction history block — copy that treatment, not the dashboard card's icon-badge treatment (this is a denser table row, no room for an icon per cell) |
| Date cell | plain `<span className="text-muted-foreground">`, absolute date + time (`he-IL` locale, e.g. `formatDate` extended with time) | Absolute date+time chosen over dashboard's relative "3h ago" — this is a review/audit list where precision matters more than glanceability; add a `title` attribute with the full ISO timestamp for tooltip precision if trivial |
| Mobile row | plain `<button>` card, same shape as `Customers.tsx`'s `CustomerCard` | Avatar + name + type/amount inline + date below, full-width tappable card |
| Load more | `Button` variant="outline" size="sm", label `t('admin.activity.loadMore', { count })` | Exact pattern from `Customers.tsx`'s "show more" button; disabled + spinner/`…` label while the next page is in flight (mirror `AwardPointsDialog`/gift-button's `gifting ? '…' : label` convention) |
| Result count | plain `<span className="text-xs text-muted-foreground">` | "showing X of Y transactions" — Y only known/shown if a cheap `count: 'exact'` head query is affordable; if not, omit the total and show "showing X transactions" |
| Loading skeleton | local `Skeleton` helper (`<div className="animate-pulse rounded bg-muted" />`) — already defined identically in `Dashboard.tsx`, `Customers.tsx`, `customer-detail-panel.tsx` | Reuse the pattern, 8 skeleton rows matching the real row height |
| Empty state (no data) | `Clock` icon (lucide, already imported in `Dashboard.tsx`) + copy, centered, same treatment as `Customers.tsx`'s empty state (`Users` icon, `opacity-30`) | |
| Empty state (filtered) | `Search` icon + copy + "clear filters" link | Same treatment as `Customers.tsx`'s filtered-empty state |
| Error state | `AlertTriangle` icon (already imported elsewhere) + copy + retry `Button` | New pattern for this app (no existing page surfaces a query error inline) — keep it minimal, consistent with the empty-state layout above it |
| Customer detail (row click) | `CustomerDetailPanel` (desktop) / `CustomerDetailDrawer` (mobile) — imported from `@/components/owner/customer-detail-panel` | Reused as-is, zero changes needed; pass the clicked transaction's `customer_id` resolved to an `OwnerCustomer` (requires the activity hook to also select enough customer fields — see interaction states below) |
| Dashboard "view all" link | `Link to="/owner/activity"` (was `/owner/customers`) | One-line change in `RecentActivityCard`, `Dashboard.tsx:158` |
| Route registration | new `<Route path="activity" element={<OwnerActivity />} />` inside the existing `/owner` `RequireOwner` block in `AppAdmin.tsx`, alongside `customers`/`products`/etc. | Lazy-loaded like every other owner page: `const OwnerActivity = lazy(() => import('@/pages/owner/Activity'))` |

No new `enroll-ui` package components are needed — everything composes from `Input`, `Button`, plus local Tailwind markup already established by `Customers.tsx` and `customer-detail-panel.tsx`.

---

## 5. Interaction states

**Loading (initial)**
- First page fetch (default: 50 rows, `order('created_at', { ascending: false }).range(0, 49)`) shows the 8-row skeleton block from §3.3. Filters/search inputs render immediately (not skeletoned) so the owner can start typing/selecting while data loads, same as `Customers.tsx` (search box isn't gated on `loading`).

**Loading more (pagination)**
- Clicking "load more" fetches the next `range()` window and appends to the in-memory list (does not refetch from the start). Button shows a busy state (`…` or spinner, disabled) during the fetch, same convention as the gift-points button in `customer-detail-panel.tsx`. Button and result count hide once the fetched page count reaches the total (or a fetch returns fewer than the page size, signaling end-of-data — needed if an exact count query is skipped for cost reasons).
- Changing a filter or the search query resets the cursor and refetches from the start (mirrors `Customers.tsx`'s `useEffect(() => setPage(1), [...])` reset-on-filter-change pattern), applied via server-side `.ilike()`/`.eq()` query params, not client-side re-slicing.

**Empty — no transactions ever**
- Distinguished from "filtered to zero" the same way `Customers.tsx` distinguishes `emptyNone` vs `emptyFiltered`: check whether any filter/search is active. Copy: "no activity yet — transactions will show up here once customers start earning or redeeming points." No CTA needed (this is an internal owner tool, not a guest-facing enrollment surface — doc-12's guest-enrollment-CTA guidance applies to the consumer app, not here).

**Empty — filtered to zero**
- Copy: "no transactions match your filters", with a "clear filters" link that resets search + both `NativeSelect`s, same as `Customers.tsx`'s `clearFilters` action.

**Error**
- Query failure (network/RLS/etc.) replaces the list area with the error block from §3.6: "couldn't load recent activity" + "try again" button that re-triggers the fetch. Filters/search remain visible and interactive above it so the owner isn't fully blocked from retrying with different params. Skeleton and error are mutually exclusive with the loaded/empty states.

**No permission / guest**
- Not applicable in the sense doc-12 uses it (guest vs. enrolled is a consumer-app concept). The admin app's only gate is `RequireOwner` in `AppAdmin.tsx`, already wrapping the whole `/owner` route tree — a non-owner never reaches this page; no additional gating logic needed here.

**Row click (customer drill-in)**
- Opens the existing `CustomerDetailPanel`/`CustomerDetailDrawer` for that transaction's customer, exactly as `Customers.tsx` does on row click. If the activity hook doesn't already have the full `OwnerCustomer` shape for a given `customer_id` (likely, since the activity query only needs `customers(name)` for display), fetch/find it from `useOwnerCustomers()`'s already-loaded list by id rather than issuing a second query per click — acceptable because that hook already loads the full customer roster for `Customers.tsx`.
