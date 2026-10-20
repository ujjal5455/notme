# Notme — Learning Guide

This guide grows after every phase. By the end it should let you rebuild Notme **from an empty folder without AI**. Read it in order; each section says which phase filled it in.

| # | Section | Status |
|---|---|---|
| 1 | Prerequisites and environment setup | ✅ Phase 1 |
| 2 | JavaScript and TypeScript basics used by the app | 🟡 started Phase 1 (more in 2, 5) |
| 3 | React components, props, state, events and forms | 🟡 started Phase 1 (forms in Phase 2) |
| 4 | Request/domain types and state transitions | 🟡 types in Phase 1; transitions Phase 2 |
| 5 | SQL schema, relations, constraints and migrations | ⏳ Phase 3 |
| 6 | Authentication, roles, pairing and authorization | ⏳ Phase 4 |
| 7 | Row Level Security and safe approval/rejection | ⏳ Phases 3, 6 |
| 8 | Request lifecycle and database reads/writes | ⏳ Phase 5 |
| 9 | Realtime subscriptions or polling and cleanup | ⏳ Phase 6 |
| 10 | Timeout, visual/audio warnings and failure handling | ⏳ Phase 7 |
| 11 | Tests, debugging, deployment and environment variables | 🟡 tests started Phase 1; rest Phases 8–9 |
| 12 | Diagrams, glossary, common errors, exercises, rebuild checklist, judge Q&A | 🟡 glossary started; completed Phase 8 |

---

## The big picture (read first)

Notme has one job: before an elder pays an urgent request, a family member **they linked in advance** confirms the exact amount and recipient on **their own device**. Each request is in one of four states:

| State | Meaning | What the elder should do |
|---|---|---|
| `pending` | Waiting for the family member | Wait. Don't pay yet. |
| `approved` | Family member confirmed these exact details | Proceed carefully. Approval doesn't prove the recipient is safe. |
| `rejected` | Family member says they didn't ask for this | Don't pay. Call them on a known number. |
| `expired` | No answer before the deadline | **Unconfirmed** (not proven fraud). Don't pay until you reach them. |

---

## 1. Prerequisites and environment setup  *(Phase 1)*

**Install:** Node.js LTS (includes npm), Git, a code editor (VS Code). Check them:

```bash
node --version
npm --version
git --version
```

**Create the project from nothing (what Phase 1 did):**

```bash
npm create vite@latest notme -- --template react-ts
cd notme
npm install
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom
npm run dev
```

Then add the `typecheck` and `test` scripts to `package.json` (see section 11) and the `test` block in `vite.config.ts`.

**Git, first time on a computer:**

```bash
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
git init
git add .
git commit -m "Initial scaffold"
```

### Concept: Node and npm
- **Node.js** runs JavaScript *outside* the browser. Our tools (Vite, TypeScript, Vitest) are JavaScript programs, so they need Node.
- **npm** is Node's package manager: it downloads libraries listed in `package.json` into `node_modules/`.
- **Analogy:** `package.json` is a shopping list, npm is the person who goes shopping, and `node_modules/` is the pantry. You never commit the pantry to Git; anyone can rebuild it from the list with `npm install`.
- `package-lock.json` records the *exact* versions bought, so every teammate gets identical packages. Commit it.

### Concept: Vite
- During development, `npm run dev` starts a local web server that serves our files and **reloads the page instantly** when you save.
- For production, `npm run build` bundles everything into a few small files in `dist/` that any static host can serve.
- **Analogy:** Vite is the kitchen. You cook (edit) in the kitchen; `build` packs the finished meal into boxes for delivery.

---

## 2. JavaScript and TypeScript basics used so far  *(Phase 1)*

| Feature | Example from our code | Meaning |
|---|---|---|
| `const` | `const now = Date.now()` | A name that won't be reassigned |
| Arrow function | `(n: number) => new Date(now + n * 60_000)` | A short way to write a function |
| Template literal | `` `status-badge status-${status}` `` | A string with a value inserted |
| Destructuring | `const { icon, label } = STATUS_LABELS[status]` | Pull named fields out of an object |
| Array `.filter` | `mockRequests.filter((r) => r.elderId === mockElder.id)` | Keep only the items that pass a test |
| Array `.map` | `requests.map((request) => <li …>)` | Turn each item into something else |
| Array `.find` | `mockRequests.find((r) => r.id === view.requestId)` | First matching item, or `undefined` |
| `??` | `familyMember?.displayName ?? 'your family member'` | Use the right side if the left is `null`/`undefined` |
| `?.` | `familyMember?.displayName` | Read a field only if the object exists |
| `import` / `export` | `export function formatInr…` / `import { formatInr } from '../lib/format'` | Share code between files |

### TypeScript types
TypeScript adds **labels describing what shape data has**. The editor and `npm run typecheck` then catch mistakes before the app runs.

```ts
// src/types/domain.ts
export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'expired'

export interface MoneyRequest {
  id: string
  amountInr: number
  note: string | null   // either text or nothing
  status: RequestStatus
  // …
}
```

- A **union type** (`'a' | 'b'`) means "only one of these exact values". Writing `status: 'aproved'` (typo) is a compile error.
- An **interface** describes an object's fields.
- `string | null` means the value may be missing; TypeScript forces you to handle that case.
- **Analogy:** types are the labelled slots in a pill organiser. You can't put Tuesday's pill in the Friday slot without noticing.

**Discriminated union** (`src/types/view.ts`): every option has a `name`. After checking `view.name === 'requestDetail'`, TypeScript *knows* `view.requestId` exists.

---

## 3. React components, props, state and events  *(Phase 1; forms in Phase 2)*

### Components and JSX
A **component** is a function that returns what should appear on screen. The HTML-like syntax inside is **JSX**.

```tsx
// src/components/StatusBadge.tsx (simplified)
export function StatusBadge({ status }: StatusBadgeProps) {
  const { icon, label } = STATUS_LABELS[status]
  return (
    <span className={`status-badge status-${status}`}>
      <span aria-hidden="true">{icon}</span> {label}
    </span>
  )
}
```

JSX rules to remember:
- Use `className`, not `class`. Use `htmlFor` on labels, not `for`.
- `{ }` inserts a JavaScript value.
- A component name starts with a capital letter: `<StatusBadge />`.
- A component returns **one** parent element (or a fragment `<>…</>`).

### Props: inputs to a component
Props are arguments passed from parent to child, like function parameters.

```tsx
<RequestCard request={request} onOpen={onOpenRequest} />
```

`RequestCard` receives `request` (data) and `onOpen` (a function to call when tapped). **Data flows down through props; events flow up through callback functions.**

**Analogy:** props are an order slip handed to a cook. The cook can't change the slip; they just cook from it.

### State: memory that changes the screen
```tsx
// src/App.tsx
const [role, setRole] = useState<UserRole>('elder')
const [view, setView] = useState<View>({ name: 'elderHome' })
```

- `useState` returns the current value and a setter.
- Calling the setter (`setView(...)`) makes React **re-run the component** and update the screen.
- Never change state directly (`view.name = 'x'` won't update the screen).
- **Analogy:** state is the whiteboard in a shop. When someone rewrites it, everyone looks up and updates what they're doing.

### Events
```tsx
<button type="button" onClick={() => onSwitchRole('family')}>Family</button>
```

`onClick` receives a function that React calls when the button is pressed. In `CreateRequest.tsx`, `onSubmit` calls `event.preventDefault()` so the browser doesn't reload the page.

### Conditional rendering
```tsx
{requests.length === 0 ? <p>No requests…</p> : <ul>…</ul>}
{needsWarning && viewerRole === 'elder' && <div role="alert">…</div>}
```

### Lists and keys
```tsx
{requests.map((request) => (
  <li key={request.id}>…</li>
))}
```

`key` lets React track which item is which. Use a stable ID, not the array index.

### CSS (plain, mobile-first)
- All styles are in `src/styles/global.css`, imported once in `main.tsx`.
- **Mobile-first:** the base rules are for a ~375 px phone, and `@media (min-width: 48rem)` adds desktop tweaks.
- **Design tokens:** colours live in `:root` as variables (`--color-primary`) and are used with `var(--color-primary)`. Change once, update everywhere.
- **Accessibility built in:**
  - 18 px base text and 48 px minimum tap height;
  - a visible `:focus-visible` outline;
  - status shown with **words + symbol**, not colour alone;
  - a "Skip to main content" link.

---

## 4. Domain types  *(types in Phase 1; transitions in Phase 2)*

- `UserRole = 'elder' | 'family'`
- `RequestStatus = 'pending' | 'approved' | 'rejected' | 'expired'`
- `MoneyRequest`: one request. `amountInr` is a **whole number of rupees**, because decimals in JavaScript can round badly (`0.1 + 0.2` gives `0.30000000000000004`).
- `expired` will be **calculated** from `expiresAt` in later phases, not stored.

---

## 11. Tests and scripts  *(started Phase 1)*

| Script | Command it runs | Why |
|---|---|---|
| `npm run dev` | `vite` | Local dev server |
| `npm run lint` | `oxlint` | Finds suspicious code (e.g. breaking React's hook rules) |
| `npm run typecheck` | `tsc -b` | Type errors across the whole project |
| `npm test` | `vitest run` | Runs all `*.test.ts(x)` files once |
| `npm run build` | `tsc -b && vite build` | Typecheck, then build `dist/` |

**How a component test works** (`src/App.test.tsx`):
```tsx
render(<App />)                                               // draw it in a fake browser (jsdom)
fireEvent.click(screen.getByRole('button', { name: 'Family' }))  // act like a user
expect(screen.getByRole('heading', { name: /requests to confirm/i })).toBeInTheDocument()  // check
```

We find elements **by role and visible text**, the way a user (or screen reader) would. If a test can't find a button by its name, a blind user probably can't either.

---

## Phase 1 file-by-file

| File | What it does / why it exists | Inputs → outputs | Common mistakes | Practice task |
|---|---|---|---|---|
| `package.json` | Project name, scripts, dependency list | — | Editing `node_modules` by hand; forgetting to commit `package-lock.json` | Add a script `"hello": "echo hi"` and run `npm run hello` |
| `vite.config.ts` | Vite plugins + Vitest settings (jsdom, setup file) | — | Forgetting `environment: 'jsdom'` → "document is not defined" in tests | Find where the setup file path is set |
| `tsconfig*.json` | TypeScript settings: `app` for `src/`, `node` for config files | — | Turning off `strict` checks to "fix" errors | Find which file includes the `src` folder |
| `.oxlintrc.json` | Lint rules (React hooks, TypeScript) | — | Ignoring warnings | Read the two React rules and explain them |
| `index.html` | The single HTML page; `<div id="root">` is where React draws | — | Removing the `root` div | Change the `<title>` and watch the tab update |
| `src/main.tsx` | Starts React: finds `#root`, renders `<App />`, imports CSS | — | Importing CSS twice | Explain what `StrictMode` is for (look it up) |
| `src/App.tsx` | Holds `role` + `view` state, chooses the page, filters mock data | state → which page shows | Calling `setView` directly instead of `goTo` (skips scroll-to-top) | Make the app start on the Safety page |
| `src/types/domain.ts` | Shared data shapes | — | Using `number` for status instead of a union | Add `'cancelled'` to `RequestStatus` and follow the type errors (then undo) |
| `src/types/view.ts` | Which screens exist | — | Adding a screen here but not in `App.tsx`'s `switch` | — |
| `src/mock/mockData.ts` | Synthetic profiles + 4 requests (one per status) | — | Using real names/UPI IDs | Add a 5th pending request |
| `src/lib/format.ts` | `formatInr`, `formatDateTime` using `Intl` | number/ISO string → readable text | Hand-writing commas (Indian grouping is 1,00,000) | Add `formatShortDate` |
| `src/components/Layout.tsx` | Header, demo banner, demo role switch, nav, `<main>` | role, current view, callbacks, children | Using `<div onClick>` instead of `<button>` (keyboard users can't press it) | Add a footer line |
| `src/components/StatusBadge.tsx` | Status as text + symbol | `status` → badge | Showing colour only | Change an icon |
| `src/components/RequestCard.tsx` | Tappable summary of one request | `request`, `onOpen` | Putting `<div>` inside `<button>` (invalid HTML; we use `<span>`) | Show the note on the card |
| `src/pages/ElderHome.tsx` | Greeting, main action, elder's requests | elder, family, requests, callbacks | Forgetting the empty state | — |
| `src/pages/CreateRequest.tsx` | Form layout; honestly says nothing is sent yet | family, `onCancel` | Inputs without `<label htmlFor>` | — |
| `src/pages/FamilyInbox.tsx` | Requests assigned to the family member | family, requests, `onOpenRequest` | — | — |
| `src/pages/RequestDetail.tsx` | Full details + warning for rejected/expired (elder view) | request, people, viewer role | Wording that claims "scam" or "safe" | — |
| `src/pages/AboutSafety.tsx` | What answers mean, what Notme does NOT do | — | Overclaiming | — |
| `src/styles/global.css` | All styling, mobile-first | — | Fixed pixel widths that overflow phones | — |
| `src/test/setup.ts` | Test helpers: jest-dom matchers, cleanup, `scrollTo` stub | — | — | — |
| `*.test.ts(x)` | Automated checks | — | Testing CSS class names instead of what the user sees | — |
| `.gitignore` | Keeps `node_modules`, `dist`, `.env*` out of Git | — | Committing `.env.local` | — |
| `.env.example` | Placeholder names for Phase 4 settings | — | Putting real keys here | — |

---

## How to add a small component without AI (recipe)

1. **Decide the props.** What does it need from its parent? Write them as an interface.
2. **Create the file** `src/components/MyThing.tsx`:
   ```tsx
   interface MyThingProps {
     text: string
   }

   export function MyThing({ text }: MyThingProps) {
     return <p className="my-thing">{text}</p>
   }
   ```
3. **Use it** in a page: `import { MyThing } from '../components/MyThing'`, then `<MyThing text="Hello" />`.
4. **Style it** in `global.css` with `.my-thing { … }`.
5. **Check:** `npm run typecheck` (did you pass the right props?), `npm run lint`, then look in the browser.
6. **Test it** (optional): copy `StatusBadge.test.tsx`, render your component, and `expect` the text.

---

## Phase 1 exercises (do these without AI)

1. **Footer.** Create `src/components/Footer.tsx` that shows "Notme prototype · synthetic data". Render it at the bottom of `Layout`, style it with small muted text, and make sure `npm run lint`, `npm run typecheck` and `npm test` still pass.
2. **New mock request.** Add a fifth mock request for ₹999 with status `pending`. Where does it appear, and why does it appear in *both* the elder and family lists?
3. **Break it on purpose.** In `RequestCard.tsx`, change `request.amountInr` to `request.amount`. Run `npm run typecheck`. Read the error and explain it in your own words, then undo the change.
4. **Test it.** Write a test that switches to Family, opens the ₹25,000 request, and checks that the text "Confirm and Reject buttons are added in Phase 2." appears.

*(Answers aren't included. Try first, then ask a teammate or your reviewer.)*

## Phase 1 self-test

1. What does `npm install` read, and where does it put things?
2. What is the difference between a prop and state?
3. Why does `RequestCard` receive an `onOpen` function instead of changing the view itself?
4. Why is `amountInr` a whole number?
5. What does `key={request.id}` do?
6. Why are statuses shown with words and symbols, not just colours?
7. What file decides which page is visible?
8. Why does `.env.example` exist if `.env` files are ignored by Git?

---

## 12. Glossary  *(grows every phase)*

- **Component:** a function that returns UI.
- **JSX:** HTML-like syntax inside JavaScript/TypeScript.
- **Props:** inputs passed from a parent component to a child.
- **State:** data a component remembers; changing it re-renders the screen.
- **Type / interface:** a description of what shape data has.
- **Union type:** a value that may be one of a fixed set of options.
- **Lint:** automatic check for suspicious code patterns.
- **Bundle / build:** turning source files into optimised files for the browser.
- **jsdom:** a fake browser that runs inside Node for tests.
- **Mock data:** made-up data standing in for a real database.
