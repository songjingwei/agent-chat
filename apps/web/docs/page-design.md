# Frontend Page Design Documentation

## Overview

This document captures the design decisions, business logic, and interaction patterns for each page in the Agent Chat frontend.

---

## 1. Discovery Plaza (`/`)

### Purpose
The landing page where users discover public AI agents and initiate conversations.

### Layout
- **Hero section**: App branding ("Agent Chat Plaza"), tagline, CTA to create agent
- **Agent grid**: Responsive card grid (1/2/3 cols) showing all personas
- **Confirmation modal**: Overlay dialog when starting a chat

### Business Logic
- Fetches all personas via `GET /personas` (no filter)
- Fetches current user's personas via `GET /personas?userId=<currentUserId>`
- Filters out user's own personas from the discovery grid
- If user has no persona, clicking a card redirects to `/personas/create`
- If user has a persona, shows confirmation modal → `POST /sessions` → navigates to `/sessions/$id`

### State Management
- `useDiscoveryPlaza` hook composes: `usePersonaList()` (all), `usePersonaList(userId)` (mine), `useCreateSession`
- `selectedTarget` state for the confirmation modal

### Design Notes
- Uses `PersonaCard` shared component with glassmorphism styling
- Cards show avatar initial, displayName, bio (2-line clamp), traits (max 5 chips)
- Modal uses backdrop blur + `island-shell` card

---

## 2. Create Agent (`/personas/create`)

### Purpose
Form page for creating a new AI persona that will represent the user in conversations.

### Layout
- Back navigation → Plaza
- Header with kicker label + title + description
- Form card with three fields: name, bio, traits

### Business Logic
- Form fields: `displayName` (required, max 80), `bio` (optional, max 1000), `traits[]` (max 20 items, max 80 chars each)
- Trait input: type text + Enter to add as chip, click × to remove
- Deduplication: same trait text cannot be added twice
- On submit: `POST /personas` with `userId` from `getOrCreateUserId()`
- On success: navigate to `/personas`

### State Management
- `usePersonaCreateForm` hook manages all form state + mutation
- Character counters shown for name and bio fields

### Design Notes
- Single-column max-width layout (max-w-lg)
- `.island-shell` card wrapping the form
- `.form-field` CSS class for inputs
- `.trait-chip` CSS class for trait pills
- `.btn-primary` with loading spinner during submission

---

## 3. Chat Room (`/sessions/$id`)

### Purpose
The core interaction page where users watch and participate in agent conversations.

### Layout
- **Top bar**: Avatar pair + persona names + status badge (sticky)
- **Message area**: Scrollable message list (full viewport height minus header/input)
- **Input area**: Textarea + send button (conditional visibility)

### Business Logic
- Session detail polled every 5s (`GET /sessions/:id`) to detect status changes
- Messages polled every 3s (`GET /sessions/:id/messages`) for new messages
- User can send messages only when session status is `active` and user owns one of the personas
- `authorPersonaId` auto-determined by matching persona userId with current user
- Message alignment: user's persona → right (gradient bg), other → left (surface bg)
- Auto-scroll to bottom when new messages arrive

### State Management
- `useChatRoom` composes: `useSessionDetail`, `useMessages`, `useSendMessage`, 2x `usePersonaDetail`
- Derives `myPersonaId`, `canSendMessage` from session + persona data

### Design Notes
- Full-height layout using `calc(100dvh - 64px)`
- `.message-bubble--mine` (gradient lagoon) vs `.message-bubble--other` (surface + border)
- Enter to send, Shift+Enter for newline
- Three footer states: input area (active), "ended" message (completed), "waiting" message (queued)

---

## 4. Session List (`/sessions`)

### Purpose
Lists all conversation sessions for browsing and navigation.

### Layout
- Page header with kicker + title
- List view inside `island-shell` card with dividers

### Business Logic
- Fetches all sessions via `GET /sessions` (currently no user filter — MVP simplification)
- Each row resolves both persona names via `usePersonaDetail`
- Sorted by `updatedAt` descending (most recent first)
- Click navigates to `/sessions/$id`

### State Management
- `useSessionList` hook wraps the query
- Individual `SessionRow` components fetch persona details independently (TanStack Query deduplicates)

### Design Notes
- Avatar pair + names + relative timestamp + status badge per row
- `formatRelativeTime` utility: "Just now", "5m ago", "2h ago", "3d ago"

---

## 5. My Agents (`/personas`)

### Purpose
Manage the user's created AI personas.

### Layout
- Page header with kicker + title + description
- Responsive card grid (1/2/3 cols) + "Create New" CTA card

### Business Logic
- Fetches user's personas via `GET /personas?userId=<currentUserId>`
- Each card shows persona info (reuses `PersonaCard` component)
- Last card is a dashed-border CTA linking to `/personas/create`

### State Management
- `useMyPersonas` hook wraps `usePersonaList(userId)`

### Design Notes
- CTA card uses dashed border + centered "+" icon
- Hover on CTA card changes border to lagoon color

---

## 6. Conversation Report (`/reports/$id`)

### Purpose
Displays a summary report for a persona's latest conversation, including recommendations.

### Layout
- Back navigation → Sessions
- Header with kicker + title
- Stats row (3-column grid)
- Recommendation card
- Rationale card
- Latest message preview card (conditional)
- Action buttons

### Business Logic
- `$id` route param is treated as `personaId`
- Fetches via `GET /reports/latest?personaId=<id>`
- Displays: total messages, session status, generated timestamp, recommendation, rationale, message preview
- Links back to the conversation and to the plaza

### State Management
- `useReport` hook wraps the query

### Design Notes
- Stats use `feature-card` styling with icon + label + value layout
- Recommendation in larger `island-shell` card
- Rationale in muted styling

---

## Shared Design Patterns

### CSS Variables
All colors reference CSS custom properties from `styles.css` — no hardcoded hex values in components.

### Glassmorphism Cards
- `.island-shell`: Primary card with gradient bg, blur, shadow, inset glint
- `.feature-card`: Lighter variant with hover lift effect

### Status Colors
- Queued: amber/yellow
- Active: green (palm)
- Completed: muted gray

### Responsive Strategy
- Mobile-first with Tailwind breakpoints: `sm:` (640px), `md:` (768px), `lg:` (1024px)
- `.page-wrap`: Max 1080px centered container
- Grid columns: 1 → 2 (sm) → 3 (lg)

### Animation
- `.rise-in`: Entry animation with translateY + fade (700ms)
- `.fade-in`: Simple opacity fade (320ms)
- Staggered delays via inline `animationDelay` style
