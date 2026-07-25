# Design System

This document is the single reference for styling, theming, and reusable UI in
the Reviewer app. Read it before adding any new screen or component.

## 1. Theme: single source of truth

**`lib/theme.ts` is the source of truth for all colors.**

Flow at runtime:

1. `THEME.light` / `THEME.dark` (lib/theme.ts) define the palette as `hsl(...)` strings.
2. `NATIVEWIND_THEME_VARIABLES` converts them to CSS variable values.
3. `app/_layout.tsx` injects them with NativeWind `vars()` on the root `View`,
   which is what `bg-primary`, `text-muted-foreground`, etc. resolve against.
4. `global.css` mirrors the same values so web builds and tooling agree.
   **If you change a color: edit `lib/theme.ts` first, then mirror it in
   `global.css`.** Never let them drift (they once diverged into two different
   brand palettes).

### Available semantic tokens (Tailwind classes)

| Token | Classes | Use for |
|---|---|---|
| `background` / `foreground` | `bg-background`, `text-foreground` | Screen background, primary text |
| `card` / `card-foreground` | `bg-card`, `text-card-foreground` | Surfaces |
| `primary` / `primary-foreground` | `bg-primary`, `text-primary`, `text-primary-foreground` | Brand actions, active states |
| `secondary` / `secondary-foreground` | `bg-secondary`, … | Soft brand surfaces |
| `muted` / `muted-foreground` | `bg-muted`, `text-muted-foreground` | Subdued surfaces, captions |
| `accent` / `accent-foreground` | `bg-accent`, … | Premium/gold highlights |
| `destructive` | `bg-destructive`, `text-destructive` | Errors, wrong answers |
| `success` | `bg-success`, `text-success` | Correct answers, positive stats |
| `warning` | `bg-warning`, `text-warning` | Cautions (see contrast note) |
| `border` / `input` / `ring` | `border-border`, `bg-input`, `border-ring` | Hairlines, fields, focus |
| `chart-1`…`chart-5` | `bg-chart-2`, `text-chart-3`, … | Data viz, category colors |

Contrast note: the warning/accent hue is yellow — it fails contrast as text on
light backgrounds. For text, use `text-foreground dark:text-warning` (the Badge
and StatTile primitives already do this).

### Styling rules

1. **Prefer Tailwind semantic classes** (`bg-card`, `text-primary`) for
   everything NativeWind can style.
2. Reach for raw palette values **only** when a prop demands a color string
   (lucide `color`, SVG strokes, gradients, `shadowColor`):

   ```tsx
   import { useTheme, useThemePalette } from "@/hooks/use-theme"

   const { theme, isDark } = useTheme() // or: const theme = useThemePalette()
   <ArrowLeft color={theme.foreground} />
   ```

   Never write `colorScheme === "dark" ? THEME.dark : THEME.light` inline —
   that is what the hook is for.
3. **Never hardcode hex/rgba colors.** No `#ffffff`, no `#111827`, no raw
   Tailwind palette classes (`text-green-700`). Every color must trace back to
   `lib/theme.ts`.
4. `withOpacity(theme.primary, 0.12)` (from `lib/theme.ts`) is the approved way
   to tint a raw palette value.
5. Don't add `borderWidth/borderColor` inline styles on top of `Card` — the
   primitive already draws `border border-border/80`.

## 2. Layout conventions

- **Screen padding:** `px-4` for screen content (auth screens use `px-6`).
- **Card content:** `px-4 py-4` (via `CardContent`).
- **Vertical rhythm:** `gap-3` between cards in a list, `gap-5`/`gap-6` between
  sections.
- **Radius scale:** `rounded-2xl` for cards/buttons/inputs, `rounded-xl` for
  nested chips/tiles, `rounded-full` for pills and round buttons. Avoid new
  arbitrary values (`rounded-[27px]`); if a bracket value already exists in the
  file you're editing, prefer migrating it to the nearest step.
- **Touch targets:** minimum 44×44 (`h-11 w-11`); 40px (`h-10 w-10`) only with
  `hitSlop`. `IconButton` handles this for you.
- **Safe area:** screens under a native Stack header should use
  `edges={["left", "right", "bottom"]}`; full-screen (headerless) screens use
  the default edges.

## 3. Typography

Font: Plus Jakarta Sans, auto-selected by weight class in the `Text` primitive
(`font-medium` → Medium, `font-semibold` → SemiBold, `font-bold` → Bold,
`font-extrabold`/`font-black` → ExtraBold).

Semantic roles — use the components, not ad-hoc classes:

| Role | Component | Style |
|---|---|---|
| Tab-screen title | `AppShellHeader` `title` | 24px extrabold |
| Detail-screen title | `ScreenHeader` `title` | 17px black |
| Section heading | `SectionHeader` `title` | 17px extrabold |
| Section eyebrow | `SectionHeader` `eyebrow` | 11px black uppercase, tracking 1.4 |
| Card title | `CardTitle` | semibold |
| Body | `Text` | 16px regular (or `text-sm`) |
| Caption | `Text` `variant="muted"` or `text-[12px] text-muted-foreground` | |

## 4. Primitive catalog (`components/ui`)

| Component | Purpose |
|---|---|
| `Text` | Themed text; variants h1–h4, lead, large, small, muted. Handles font family + heading a11y roles. |
| `Button` | variants: default, destructive, outline, secondary, ghost, link · sizes: default, sm, lg, icon. Wrap label in `<Text>`. |
| `IconButton` | Icon-only button with **required** `label` (a11y) and ≥40px target. variants: ghost, soft, outline, muted. |
| `Card` + Header/Title/Description/Content/Footer | Standard surface. |
| `Badge` | Pill for statuses/counts/tags. variants: default, secondary, muted, success, warning, destructive, accent, outline · sizes: default, sm. String children auto-wrap in Text. |
| `Input`, `FormField`, `InputLabel` | 52px themed text field with `leading`/`trailing` slots; FormField = label + control + error/hint. |
| `SectionHeader` | eyebrow · title · subtitle · trailing `action`. Replaces hand-rolled section headers. |
| `StatTile` | label · value · caption metric tile; `tone` colors the value (success/warning/…). |
| `EmptyState` | Shared empty/error card: icon, title, description, action; `tone="destructive"` for load failures. |
| `Skeleton` | Pulse placeholder. |
| `Dialog` family | Keyboard/safe-area-aware modal. |
| `Switch` | Accessible toggle. |
| `AnswerOption` | Quiz choice row; theme-aware (selected→primary, correct→success, wrong→destructive); `colors` prop overrides for immersive surfaces. |
| `CircularProgress` | SVG ring; defaults to theme success/muted. |
| `FadeInView`, `MotionPressable` | Entrance/press motion, respects reduce-motion + user pref. |
| `MarkdownContent` | Themed markdown. |

Shared shell components (`components/`):

- `AppShellHeader` — tab-screen header (eyebrow/title/subtitle + `trailing`).
- `ScreenHeader` — detail-screen header: back IconButton + title + `trailing`.
  **Always use this instead of a hand-rolled back row.**

## 5. Accessibility checklist

- Every icon-only pressable has an `accessibilityLabel` (use `IconButton`).
- Interactive rows get `role="button"` (Button/IconButton set this for you).
- Selected states: `aria-checked` / `accessibilityState({ selected })` on
  tabs, filters, options (`AnswerOption` sets `role="radio"`).
- Touch targets ≥ 44px, or ≥ 40px with hitSlop.
- Never encode meaning in color alone — pair with icon or label
  (AnswerOption shows check/accent bar, not just green).

## 6. Motion

Use `MOTION` tokens (`lib/motion.ts`) and the `FadeInView` /
`MotionPressable` wrappers. Never animate when `useMotionEnabled()` is false
(the wrappers handle this). Stagger lists with `getStaggerDelay(index)`.

## 7. Migration status / TODO

Done:
- Theme consolidated; `success`/`warning`/`chart-*` exposed as classes.
- `useTheme()`/`useThemePalette()` replaces per-file palette ternaries.
- Auth screens use Input/FormField/Button; detail screens use ScreenHeader;
  first wave of Badge/EmptyState adoption.
- Quiz flow + diagnostics de-hardcoded (theme-aware in both modes).

Remaining (adopt opportunistically when touching a screen):
- Replace remaining hand-rolled section headers with `SectionHeader`
  (~30 sites: dashboard, home sections, review screens).
- Replace hand-rolled stat tiles with `StatTile` (home hero, dashboard,
  community feed header, profile).
- Drop redundant inline `borderWidth/borderColor` on Cards (~33 sites).
- Consolidate the duplicated Comment/Reply rows (community dialog vs
  post screen) into one shared component.
- Normalize leftover arbitrary radii and `text-[Npx]` sizes toward the scale
  in §2/§3.
