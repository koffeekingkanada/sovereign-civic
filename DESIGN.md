# Design Brief

## Direction

Sovereign Register — an official government record rendered as software: navy masthead, hairline rules, and document-grade typography.

## Tone

Restrained institutional — the aesthetic extreme is *officialdom*: high-contrast, quiet, and authoritative, with zero decoration that is not a structural signal.

## Differentiation

A gold hairline rule beneath a solid navy masthead reads as a government seal applied to a page; the interface looks like a published register, not a chat app.

## Color Palette

| Token      | OKLCH         | Role                                                        |
| ---------- | ------------- | ----------------------------------------------------------- |
| background | 0.975 0.003 250 | Page surface, faint cool-gray                              |
| foreground | 0.22 0.028 250  | Primary text, near-navy ink                                |
| card       | 1 0 0           | Directory rows, message surfaces, panels                   |
| primary    | 0.34 0.072 250  | Navy #1e3a5f — masthead, primary buttons, outgoing bubbles |
| accent     | 0.75 0.105 85   | Gold #c8a04e — hairline rules, focus rings, small marks    |
| muted      | 0.945 0.008 250 | Secondary text, metadata, sunken panels                    |

## White-Label Mapping

`src/frontend/src/lib/config.ts` is the single reskin surface. The frontend foundation writes `primaryColor` and `accentColor` into the CSS variables at runtime:

| Config field   | Default   | CSS variable        | Consumed as                          |
| -------------- | --------- | ------------------- | ------------------------------------ |
| `primaryColor` | `#1e3a5f` | `--primary`         | `bg-primary`, `text-primary`, `border-primary` |
| `accentColor`  | `#c8a04e` | `--accent`, `--rule-gold` | `bg-accent`, `text-accent`, `.rule-gold` |
| `logoPath`     | `/logo.png` | —                 | header + login emblem image          |

Reskin rule: convert hex → OKLCH `L C H` (no wrapper) and set on `document.documentElement`. Navy/gold defaults above are the fallback if config is absent.

## Typography

- Display: Space Grotesk — masthead wordmark, page titles, h1–h4, numerals.
- Body: Figtree — paragraphs, labels, buttons, list rows.
- Mono: Geist Mono — principal identifiers, timestamps, technical values.
- Scale: hero `text-4xl md:text-6xl font-bold tracking-tight`, h2 `text-2xl md:text-3xl font-semibold tracking-tight`, label `text-xs font-semibold tracking-widest uppercase`, body `text-base`.

## Elevation & Depth

Flat by default with hairline borders; cards lift only on hover via `shadow-card-resting` → `shadow-card-hover`. The masthead is the single solid navy plane, grounded by `shadow-masthead`.

## Structural Zones

| Zone    | Background          | Border                  | Notes                                              |
| ------- | ------------------- | ----------------------- | -------------------------------------------------- |
| Header  | `bg-primary` solid  | gold `.rule-gold` 2px   | Emblem logo + wordmark left, nav + user chip right |
| Content | `bg-background`     | —                       | Directory rows on `bg-card`; sections alternate `surface-sunken` |
| Footer  | `surface-sunken`    | `border-t` hairline     | Sovereignty statement, muted text                  |

## Spacing & Rhythm

Sections separated by `py-10 md:py-14`; content grouped in `space-y-3` rows inside `p-4 md:p-5` cards; micro-spacing at 4/8/12px; max content width `max-w-5xl`.

## Component Patterns

- Buttons: 6px radius, solid navy primary, outlined navy secondary (`.btn-outline-navy`), gold reserved for focus ring and emphasis only.
- Cards: 6px radius, `bg-card`, hairline `border-border`, `shadow-card-resting`, hover lift; directory rows are dense list cards.
- Badges: 4px radius, `bg-secondary` with `text-secondary-foreground`; uppercase tracking-wide for status.
- Message bubbles: 8px radius, incoming `bg-muted`, outgoing `bg-primary text-primary-foreground`.

## Motion

- Entrance: `animate-fade-in-up` (0.35s) on page content and list rows, staggered lightly.
- Hover: `transition-smooth` (0.2s) on buttons, rows, and links; color and shadow only.
- Decorative: none — no glow, no gradient, no parallax.

## Constraints

- Navy and neutral grays only; gold is an accent, never a large fill.
- No crypto, blockchain, or "secure/encrypted" imagery — E2E encryption is roadmap-only.
- No gradients as decoration, no glow shadows, no bouncy motion.
- Mobile-responsive: single column under `md`, masthead nav collapses.
- All color via semantic tokens; never raw hex or `bg-[#...]` in components.
- Never claim messages are encrypted or "totally secure".

## Signature Detail

The gold hairline under the navy masthead — a two-pixel institutional seal line that anchors every page in the app.
