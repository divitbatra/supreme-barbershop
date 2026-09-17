# Supreme Barbershop — Design System

## 1. Principle

**Restraint reads as expensive.** One warm accent in a cold frame. Generous negative space. Motion that decelerates rather than bounces. Nothing on screen that does not earn its place.

## 2. Palette

| Token | Hex | Use |
| --- | --- | --- |
| `obsidian` | `#08090B` | Page ground. Near-black, never pure `#000` — pure black kills depth on OLED. |
| `charcoal` | `#0E0F12` | The clipper body, elevated cards. |
| `graphite` | `#17191D` | Borders, dividers, inset surfaces. |
| `steel` | `#C6CAD1` | Blades, metallic highlights, secondary icons. |
| `porcelain` | `#F7F7F5` | Primary text on dark. Warm white, not `#FFF`. |
| `gold` | `#C9A227` | **Accent. Maximum 5% of any viewport.** Price, CTA hairline, active slot, progress rail. |
| `gold-deep` | `#8C6E17` | Pressed/hover state for gold. |
| `signal` | `#4ADE80` / `#F87171` | Booking confirmed / slot taken. Used once per flow, never decoratively. |

Text opacity ladder on dark: headline `100%`, body `55%`, meta `38%`.

## 3. Typography

- **Display:** *Söhne Breit* or `Neue Haas Grotesk Display` — headlines at `-0.035em` tracking, weight 500. Tight, confident, never bold.
- **Body:** *Inter Variable* — `16px/1.6`, weight 400.
- **Eyebrow/meta:** Inter, `11px`, `uppercase`, `0.38em` letter-spacing. This single treatment does most of the "premium" work.
- **Numerals:** `font-variant-numeric: tabular-nums` on every price and time so the slot grid never jitters.

Scale (fluid, `clamp()`): `72 / 48 / 32 / 22 / 16 / 13 / 11`.

## 4. Material language

- Radius: `24px` cards, `999px` buttons and slot pills.
- Elevation is **light, not shadow**: `1px` inset hairline at `rgba(255,255,255,0.08)` plus a radial glow behind the subject.
- Glass only over the 3D canvas: `backdrop-blur-md` + `bg-white/5`.
- Easing: `cubic-bezier(0.16, 1, 0.3, 1)` for entrances, `power2.inOut` for the scroll timeline. **No spring overshoot anywhere** — bounce reads as playful, and this brand is not playful.

## 5. Landing page wireframe

```
┌─ 00 · HERO ─ pinned, 320vh of scroll ──────────────────────┐
│  Act I    clipper rises from black, orbits, camera dollies │
│           "Precision, chair by chair."                     │
│  Act II   settles to 3/4 angle, gold ring ignites          │
│           "Nothing here is accidental."                    │
│  Act III  parts separate into an exploded diagram          │
│           "Sixty seconds to book."   [ Book a chair ]      │
│  Right edge: gold progress rail                            │
└────────────────────────────────────────────────────────────┘
┌─ 01 · SERVICES ─ 3 cards, stagger-in at 20% viewport ──────┐
│  Haircut $37 · 30 min                                      │
│  Beard Trim $21.50 · 20 min                                │
│  The Full Service $60 · 60 min — straight-razor finish     │
│  Middle card carries the gold hairline. Hover lifts 4px.   │
└────────────────────────────────────────────────────────────┘
┌─ 02 · THE BARBERS ─ horizontal scroll, 2 panels ───────────┐
│  Max · Kristian. Full-bleed portrait, name in display type,│
│  one line of craft, "Book with —" inline CTA.              │
└────────────────────────────────────────────────────────────┘
┌─ 03 · THE WORK ─ masonry gallery, blur-up, lightbox ───────┐
└────────────────────────────────────────────────────────────┘
┌─ 04 · VISIT ─ split 50/50 ─────────────────────────────────┐
│  Left: dark-styled map, 7906A 104 Street NW                │
│  Right: hours table, today's row marked with a gold dot    │
│         Mon–Fri 10–8 · Sat 9–7 · Sun 11–5                  │
└────────────────────────────────────────────────────────────┘
┌─ 05 · BOOK ─ #book anchor, 4 steps, one screen ────────────┐
│  ① Service   ② Barber   ③ Date + time   ④ Details          │
│  Progress: 4 hairlines, active one fills gold.             │
│  Slot grid: tabular-nums pills, taken slots struck through │
│  and disabled — showing them builds trust in the schedule. │
│  Confirm → slot pill morphs into the confirmation card     │
│  (Framer Motion shared layoutId).                          │
└────────────────────────────────────────────────────────────┘
```

## 6. Booking flow rules

- One decision per screen. Never more than six visible slots without a "show more".
- The Back affordance is always present and never destroys entered state.
- SMS consent is an **unchecked** checkbox with plain-language copy — required to proceed, never pre-ticked.
- Errors are inline and specific: "That chair was just booked" beats "Something went wrong", and it ships with the three nearest alternative times.
- Every step is reachable by keyboard; the slot grid is a `radiogroup` with roving tabindex.

## 7. Accessibility

- Contrast ≥ 4.5:1 for all body copy — `porcelain/55` on `obsidian` passes; do not go below.
- `prefers-reduced-motion`: the hero holds one composed pose, the pin is skipped, all scroll-linked motion is disabled.
- The canvas is `aria-hidden`; the hero copy is real, selectable DOM text and is what a screen reader announces.
- Focus rings are `2px` gold at `2px` offset — visible, on-brand, never removed.
