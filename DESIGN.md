---
name: "VacaCR"
description: "Costa Rican enamel bus-route placard and pulpería ledger system for verifiable group savings on Stellar Soroban."
colors:
  cream: "#f7e9d9"
  cream-deep: "#f2dec7"
  ticket-cream: "#fbf3e8"
  paper-input: "#f8f7f4"
  vermilion: "#c73828"
  vermilion-hover: "#ad2d1f"
  cobalt-band: "#0f4787"
  cobalt-btn: "#164584"
  cobalt-hover: "#0b3568"
  gold-rail: "#ebb02d"
  gold-shade: "#e5b24c"
  ink: "#1d1510"
  ink-muted: "#594d43"
  rule: "#7e7264"
typography:
  display:
    fontFamily: "Jockey One, sans-serif"
    fontSize: "clamp(1.95rem, 6.95vw, 5.98rem)"
    fontWeight: 400
    lineHeight: 0.94
    letterSpacing: "0.01em"
  numeral:
    fontFamily: "Barlow Condensed, Archivo, sans-serif"
    fontSize: "clamp(1.95rem, 5.35vw, 4.6rem)"
    fontWeight: 700
    lineHeight: 0.92
    letterSpacing: "-0.01em"
  headline:
    fontFamily: "Archivo, sans-serif"
    fontSize: "clamp(1.55rem, 2.35vw, 2.15rem)"
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Jockey One, sans-serif"
    fontSize: "clamp(1.75rem, 2.7vw, 2.35rem)"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0.015em"
  body:
    fontFamily: "Archivo, sans-serif"
    fontSize: "1.02rem"
    fontWeight: 400
    lineHeight: 1.58
    fontFeature: "'tnum' 1"
  label:
    fontFamily: "Archivo, sans-serif"
    fontSize: "0.84rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.01em"
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "0.85rem"
    fontWeight: 600
    lineHeight: 1.4
rounded:
  xs: "4px"
  sm: "6px"
  md: "8px"
  btn: "9px"
  lg: "12px"
  xl: "14px"
  placard: "16px"
  pill: "999px"
spacing:
  xs: "0.35rem"
  sm: "0.65rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
  section: "4.25rem"
components:
  button-vermilion:
    backgroundColor: "{colors.vermilion}"
    textColor: "{colors.paper-input}"
    rounded: "{rounded.btn}"
    padding: "0.55rem 1.05rem"
    height: "44px"
  button-vermilion-hover:
    backgroundColor: "{colors.vermilion-hover}"
  button-cobalt:
    backgroundColor: "{colors.cobalt-btn}"
    textColor: "{colors.paper-input}"
    rounded: "{rounded.btn}"
    padding: "0.55rem 1.05rem"
    height: "44px"
  button-cobalt-hover:
    backgroundColor: "{colors.cobalt-hover}"
  button-outline:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.ink}"
    rounded: "{rounded.btn}"
    padding: "0.55rem 1.05rem"
    height: "44px"
  button-outline-hover:
    backgroundColor: "{colors.cream-deep}"
  button-ghost:
    backgroundColor: "{colors.cream-deep}"
    textColor: "{colors.ink}"
    rounded: "{rounded.btn}"
    padding: "0.38rem 0.8rem"
    height: "38px"
  input-field:
    backgroundColor: "{colors.paper-input}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0.55rem 0.85rem"
    height: "46px"
  chip-amount:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0.3rem 0.62rem"
    height: "38px"
  chip-amount-active:
    backgroundColor: "{colors.gold-rail}"
    textColor: "{colors.ink}"
  card-vaca-ticket:
    backgroundColor: "{colors.ticket-cream}"
    textColor: "{colors.ink}"
    rounded: "{rounded.placard}"
    padding: "1.5rem 1.65rem"
  card-manifest:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "1.45rem 1.45rem"
  route-progress-rail:
    backgroundColor: "{colors.gold-rail}"
    rounded: "{rounded.pill}"
    height: "18px"
---

# Design System: VacaCR

## Overview

**Creative North Star: "Rótulo de Ruta y Pulpería"**

VacaCR turns every shared Costa Rican group collection ("vaca") into a painted enamel bus-route placard and neighborhood *pulpería* ledger. Instead of hiding smart-contract rules behind dark-mode crypto neon or generic split-column fintech templates, the interface presents on-chain Stellar Soroban custody with the daylight clarity of a hand-lettered destination board: sun-warmed stucco creams, full-bleed buseta cobalt bands, double-pinstripe frames (*filete doble*), and a physical `SALIDA → META` route rail that shows exactly where pooled funds sit and how they unlock.

Information density is purposeful and transparent. Every screen makes the immutable contract bargain legible in plain Costa Rican Spanish before requesting a wallet signature—showing what is raised, when the deadline closes, and how funds either release 100% to the beneficiary or return via individual `refund()`. Motion follows physical signage mechanics: route markers glide along the track with a crisp ease-out curve (`cubic-bezier(0.16, 1, 0.3, 1)` over `420ms`) to preview typed XLM contributions in real time, while enameled buttons respond with a firm `1px` downward press (`180ms`).

**Key Characteristics:**
- Sun-baked Warm Stucco Cream (`#f7e9d9`) and Buseta Enamel Cobalt (`#0f4787`) architectural bands replacing white-card SaaS layouts and dark crypto dashboards.
- Double-pinstripe enamel framing (*filete doble*) built with inward cream-and-cobalt inset rims on the hero placard and paired `2px` borders plus inset `1.5px–2px` outlines across tickets, manifests, banners, and buttons.
- Strict accent discipline reserving Brick Vermilion (`#c73828`) exclusively for committing XLM (`Aportar XLM`), active route progress, and focus/alert rings.
- Purpose-built four-voice type system pairing condensed sign-painter `Jockey One` titles, smooth oval `Barlow Condensed` route numerals and wordmark, grotesque `Archivo` tabular body copy, and `ui-monospace` on-chain identifiers.
- Interactive `SALIDA → META` route rails that preview projected pool completion with diagonal striped fills before a transaction is signed.
- Plain, jargon-free Costa Rican Spanish paired with one-click Stellar Lab and Stellar Expert verification links.

## Colors

A daylight Costa Rican signage palette grounded in warm limewashed stucco and deep buseta cobalt enamel, illuminated by maracuyá gold route tracks and punctuated sparingly by brick vermilion action pins.

### Primary
- **Brick Vermilion** (`#c73828`): Reserved strictly for the primary transactional CTA (`Aportar XLM`), the active `SALIDA → META` progress fill and capsule pin, field validation highlights, and `:focus-visible` outlines.
- **Fired Vermilion** (`#ad2d1f`): Deepened hover state for primary contribution buttons.

### Secondary
- **Buseta Enamel Cobalt** (`#0f4787`): Full-bleed structural bands framing the hero placard and vaca creation sheet, inset and concentric double-pinstripe borders on featured cards and manifests, and the site footer ground.
- **Enamel Cobalt Action** (`#164584`): Secondary and system-level enameled buttons including `Conectar Wallet`, `Crear nueva vaca`, `Reclamar meta para beneficiario`, and `Inspeccionar en Stellar Lab`.
- **Deep Garage Cobalt** (`#0b3568`): Hover state for cobalt enamel buttons.

### Tertiary
- **Maracuyá Route Gold** (`#ebb02d`): Unfilled track of the `SALIDA → META` progress rail, active/hovered quick-amount preset chips, `Parada 1–3` onboarding badges, and the `3px` top trim of the footer.
- **Sign-Painter Gold Shade** (`#e5b24c`): Warm offset drop-shade (`rgba(229, 178, 76, 0.72–0.9)`) painted behind `Jockey One` vaca titles and `Barlow Condensed` endpoint numerals.

### Neutral
- **Warm Stucco Cream** (`#f7e9d9`): Default page canvas, masthead bar, hero vaca placard, contract manifest, commission sheet, and featured ticket surface.
- **Aged Pulpería Cream** (`#f2dec7`): Comparison ledger header row and hover/resting fill for outline and ghost enamel buttons.
- **Warm Ledger Parchment** (`#fbf3e8`): Resting card surface for active vaca tickets in the roster and the comparison ledger body.
- **Chalk Ticket Paper** (`#f8f7f4`): High-legibility fill reserved for interactive `<input>` wells, live feedback banners, and compact copy buttons.
- **Roasted Coffee Ink** (`#1d1510`): Primary reading copy, headlines, display lettering, and structural double-pinstripe borders on tickets, pills, and tables.
- **Weathered Umber** (`#594d43`): Secondary metadata labels, helper copy, and subtle timestamps.
- **Warm Mortar Rule** (`#7e7264`): Mid-tone control strokes on compact utility buttons and preset chips.

### Named Rules
**The Vermilion Ticket Rule.** Brick Vermilion (`#c73828`) appears only where XLM moves or advances (`Aportar XLM`, the active route bar fill and pin, error states, and focus rings); wallet connection, navigation, vaca creation, and explorer links always use Enamel Cobalt Action (`#164584`) or outline treatments.

**The Warm Stucco Ground Rule.** Pure `#ffffff` and pure `#000000` never appear as surface backgrounds or typography ink; surfaces step from Warm Stucco Cream (`#f7e9d9`) to Warm Ledger Parchment (`#fbf3e8`) to Chalk Ticket Paper (`#f8f7f4`), anchored by Roasted Coffee Ink (`#1d1510`).

## Typography

**Display Font:** Jockey One (`400`, with `sans-serif` fallback)
**Numeral & Wordmark Font:** Barlow Condensed (`600, 700`, with `Archivo, sans-serif` fallback)
**Body Font:** Archivo (variable `400–800`, with `sans-serif` fallback)
**Mono Font:** `ui-monospace` (`"SFMono-Regular", Menlo, Consolas, monospace`)

**Character:** Condensed uppercase `Jockey One` gives vaca destination titles and rule stamps the punch of hand-painted Costa Rican bus boards, while `Barlow Condensed` supplies smooth oval fare-board numerals (`0.00` / `10.00`) and the `VacaCR` wordmark; clean grotesque `Archivo` grounds dense operational copy and tabular figures alongside crisp `ui-monospace` Stellar contract identifiers.

### Hierarchy
- **Display** (`Jockey One`, `400`, `clamp(1.95rem, 6.95vw, 5.98rem)` / `6.95cqw` in hero frame, `0.94` line-height, `0.01em` letter-spacing, uppercase): Hero vaca placard title (`MEJENGA DEL SÁBADO`), finished with a warm Sign-Painter Gold Shade (`#e5b24c`) drop-shadow.
- **Numeral** (`Barlow Condensed`, `700`, `clamp(1.95rem, 5.35vw, 4.6rem)` / `5.35cqw` in hero frame, `0.92` line-height, `-0.01em` letter-spacing): Smooth oval condensed `SALIDA` / `META` XLM figures with warm gold drop-shade, plus the `700`-weight `VacaCR` masthead wordmark (`3.18cqw` desktop, `1.75rem` mobile, `-0.015em` tracking).
- **Headline** (`Archivo`, `800`, `clamp(1.55rem, 2.35vw, 2.15rem)`, `1.15` line-height, `-0.02em` letter-spacing): Major section headings (`Tablero de colectas en Testnet`, `Abrir una nueva vaca en Soroban`) and paired `700`-weight column headings (`Cómo funciona el contrato`, `Contrato en Testnet`).
- **Title** (`Jockey One`, `400`, `clamp(1.75rem, 2.7vw, 2.35rem)`, `1.0` line-height, `0.015em` letter-spacing): Individual vaca ticket titles inside the active board and condensed rule-flow stamps (`100% → BENEFICIARIO · VENCIDO → REEMBOLSO`).
- **Body** (`Archivo`, `400–500`, `1.02rem`, `1.58` line-height, `58ch–66ch` max measure): Narrative lead paragraphs, section subcopy, comparison ledger cells (`0.93rem`), and contract rule summaries with `font-variant-numeric: tabular-nums` enforced globally.
- **Label** (`Archivo`, `700`, `0.84rem`, `1.2` line-height, `0.01em` letter-spacing): Status stamps, quick-amount preset chips, form labels (`0.95rem`), and onboarding `Parada` badges (`0.78rem`).
- **Mono** (`ui-monospace`, `600`, `0.85rem` / `0.85em`, `1.4` line-height): Shortened Stellar `G…` keys, Soroban contract IDs (`C…`), function names (`create_vaca`, `claim()`, `refund()`), and RPC hostnames set over a `4px`-rounded `rgba(29, 21, 16, 0.07)` ink wash.

### Named Rules
**The Sign-Painter Display & Fare Numeral Rule.** Restrict `Jockey One` to uppercase vaca titles and compact rule stamps, and reserve `Barlow Condensed` for smooth oval `SALIDA` / `META` numerals and the `VacaCR` wordmark; all prose, labels, buttons, and inputs stay in `Archivo`.

**The Tabular Escrow Rule.** Keep `font-variant-numeric: tabular-nums` active across `body`, `button`, and `input` elements, and isolate on-chain addresses and contract calls in `ui-monospace` `<code>` chips so live RPC updates never cause horizontal layout shift.

## Layout

VacaCR combines a proportionally scaled first-viewport signage frame with a structured editorial and operational ledger below the fold:

- **Proportional First-Viewport Placard (`>960px`):** `.comp-frame` locks to a `1376 / 768` aspect ratio (`container-type: inline-size`) where the cream masthead, full-bleed Buseta Enamel Cobalt (`#0f4787`) hero band, inward-bordered cream placard, `SALIDA → META` route rail, 3-step summary strip, and dual below-the-fold column headings (`Cómo funciona el contrato` and `Contrato en Testnet`) scale in container-query width (`cqw`) units.
- **Below-the-Fold Workspace Container:** `.page-body` centers at `92.15%` width (`max-width: 1480px`) with `2.15rem` top padding, `4.5rem` bottom padding, and a `4.25rem` (`spacing.section`) vertical cadence between major sections, culminating in a full-bleed `100vw` cobalt commission band above the footer.
- **Asymmetric & Tripartite Grids:**
  - Narrative section splits `minmax(0, 1fr)` (informal vaca vs. Soroban comparison ledger) against `minmax(300px, 32.18%)` (verifiable Testnet contract manifest) with a `2.2rem` gap aligned directly beneath the dual first-viewport section headings.
  - Testnet onboarding (`Parada 1–3`) and vaca ticket metadata use equal 3-column grids (`repeat(3, minmax(0, 1fr))`) divided by `1px` warm mortar hairlines rather than separate cards.
  - The vaca creation sheet pairs a `0.95fr` live rule summary column with a `1.25fr` form column (`2.2rem` gap), nesting `Meta total` and `Plazo` in a 2-column subgrid (`1rem` gap).
- **Responsive Reflow (`≤960px` and `≤720px`):**
  - At `≤960px`, `.comp-frame` releases its fixed aspect ratio and converts into a 4-column CSS Grid (`14px minmax(0, 1fr) minmax(0, 1fr) 14px`) via `display: contents`, preserving every masthead and placard element—including the wrapped navigation row, compact Testnet contract pill, `Reglas` and `Monto en XLM` labels, and `46px`-tall contribution controls—while collapsing below-the-fold grids to `1fr` (`width: calc(100% - 32px)`) and revealing a dedicated mobile `Contrato en Testnet` heading above the manifest.
  - At `≤720px`, the comparison table hides its column headers visually (preserving screen-reader structure) and stacks cells vertically with bold `data-col` prefixes (`Cuenta personal:`, `Custodia Soroban:`), while ticket contribution controls expand to `100%` width.

## Elevation & Depth

VacaCR uses **flat architectural enamel layering with whispered ambient lift**. Hierarchy comes from bold tonal framing—Warm Stucco Cream (`#f7e9d9`) sheets mounted inside full-bleed Buseta Enamel Cobalt (`#0f4787`) bands and double-pinstripe borders—rather than floating drop-shadow stacks or translucent blur layers. Subtle ambient shadows appear only to ground below-the-fold cards and highlight the active route preview pin.

### Shadow Vocabulary
- **Hero Placard Inset Rim** (`box-shadow: inset 0 0 0 0.24cqw #0f4787` on desktop; `inset 0 0 0 3px #0f4787` on mobile, inside a `#f7e9d9` border): Draws the cobalt inner pinstripe strictly inward inside the hero placard's bounding box so its outer cream rim stays crisp against the cobalt band.
- **Commission Concentric Ring** (`box-shadow: 0 0 0 4px #0f4787, 0 0 0 7px #f7e9d9`): Stepped enameled rim framing the below-the-fold vaca creation sheet against its full-bleed cobalt band.
- **Manifest Ambient Lift** (`box-shadow: 0 10px 24px rgba(15, 71, 135, 0.08)`): Soft cobalt-tinted ambient shadow grounding the verifiable contract manifest aside.
- **Ticket Ambient Lift** (`box-shadow: 0 10px 24px rgba(29, 21, 16, 0.06)`): Low-opacity coffee-ink shadow giving active vaca tickets gentle separation from the cream canvas.
- **Ghost Pin Preview Glow** (`box-shadow: 0 3px 10px rgba(199, 56, 40, 0.32)`): Focused vermilion halo beneath the projected route marker during contribution preview.
- **Sign-Painter Gold Shade** (`text-shadow: 1.5px 2.5px 1px rgba(229, 178, 76, 0.72)`): Painted gold relief offset behind `Jockey One` titles and `Barlow Condensed` milestone numerals.

### Named Rules
**The Pinstripe Over Drop-Shadow Rule.** Establish surface boundaries with inward or concentric enamel pinstripes (`border` + `inset` ring or `outline`) and full-bleed cobalt bands—never with heavy dark drop-shadows, `backdrop-filter` glassmorphism, or glowing neon borders.

## Shapes

The form language translates painted tin bus placards and stamped paper receipts into crisp digital geometry:

- **Double-Pinstripe Enamel Rim (*Filete Doble*):** On the hero `.r-vaca-placard`, a `0.22cqw` (`3px` mobile) outer Warm Stucco Cream (`#f7e9d9`) border pairs with an inward `inset 0 0 0 0.24cqw` (`3px` mobile) Buseta Enamel Cobalt (`#0f4787`) shadow inside its bounding box. Below the fold, containers (`.vaca-ticket`, `.contract-manifest`, `.comparison-table`, `.live-banner`) and primary/secondary/outline buttons combine a `2px solid` outer border with an inset `1.5px` or `2px solid` `outline` (`outline-offset: -5px` on controls and banners, `-6px` on cards and tables).
- **Restrained Corner Radii:** Inline code tags use `4px`; inline copy buttons and mobile contract badges use `6px`; inputs and preset chips use `7px–8px`; enameled action buttons use `9px`; banners and tables use `10px–12px`; manifests and commission sheets use `14px`; vaca tickets use `16px`.
- **Full-Capsule Route Elements (`999px`):** Strictly reserved for the `SALIDA → META` route rail, vertical capsule pins (`12px × 26px`), on-chain status stamps, and `Parada 1–3` badges.
- **Single-Stroke Mortar Hairlines:** Internal subdivisions inside comparison tables, onboarding routes, and ticket metadata use `1px solid` warm sand-mortar lines (`#cbbba7`, `#c3b29c`) rather than nested boxes.

## Components

### Buttons
Tactile enameled sign plates with inset pinstripe outlines and a physical `1px` active press.
- **Shape:** Gently rounded corners (`9px` radius), `44px` minimum touch height (`50px` on `.btn-enamel-cobalt--lg`, `38px` on ghost buttons, `32px` with `6px` radius on inline copy buttons).
- **Primary (`button-vermilion`):** Brick Vermilion (`#c73828`) fill, Chalk Ticket Paper (`#f8f7f4`) label (`Archivo`, `600` weight), `2px solid #8c271a` outer border, and `1.5px` inset cream outline (`outline-offset: -5px`), `0.55rem 1.05rem` padding. Used exclusively for `Aportar XLM`.
- **Hover / Focus:** Hover shifts primary to Fired Vermilion (`#ad2d1f`), cobalt to Deep Garage Cobalt (`#0b3568`), and outline/ghost to Aged Pulpería Cream (`#f2dec7`). `:active` translates `1px` downward (`180ms`). `:focus-visible` renders a `2.5px solid #c73828` outline (`2px` offset). Disabled buttons drop to `0.62` opacity.
- **Secondary / Outline / Ghost:** Cobalt (`button-cobalt`) uses Enamel Cobalt Action (`#164584`) with `#0e3263` border and inset cream pinstripe for wallet, claim, create, and Stellar Lab actions; Outline (`button-outline`) uses Warm Stucco Cream (`#f7e9d9`) with dual Roasted Coffee Ink (`#1d1510`) pinstripes; Ghost (`button-ghost`) uses Aged Pulpería Cream (`#f2dec7`) with a single `1.5px` muted border for secondary card dismissal and promotion.

### Chips
Compact tactile presets and stamped status pills.
- **Style:** Quick-amount chips (`+1.0`, `+2.5`, `+5.0`) use `8px`/`7px` radius, `38px` height, `0.3rem 0.62rem` padding, Warm Stucco Cream (`#f7e9d9`) background, `1.5px solid` mortar border, and `700`-weight `Archivo` Roasted Coffee Ink (`#1d1510`) numerals. Status stamps use `999px` pill radius and `1.5px` borders.
- **State:** Hovered or selected amount chips (`chip-amount--active`) switch to Maracuyá Route Gold (`#ebb02d`) with a `#593e12` border. Status stamps tint semantically by contract state (`#f7deb0` open, `#dcebd9` goal reached, `#f9dcd6` expired, `#dde7f5` claimed).

### Cards / Containers
Double-pinstriped placards and ledger sheets that separate explanation, verification, and live escrow actions.
- **Corner Style:** `16px` radius on vaca tickets, `14px` on the contract manifest, commission sheet, and mobile hero placard (`1.35cqw` desktop), `12px` on the comparison ledger, `10px` on live banners.
- **Background:** Warm Ledger Parchment (`#fbf3e8`) on standard vaca tickets and comparison tables; Warm Stucco Cream (`#f7e9d9`) on featured vaca tickets, contract manifests, hero placards, and commission sheets.
- **Shadow Strategy:** Inward cobalt inset rim on the hero placard (`inset 0 0 0 0.24cqw #0f4787`), concentric ring shadow on the commission sheet (`0 0 0 4px #0f4787, 0 0 0 7px #f7e9d9`), and subtle `0 10px 24px` ambient lift (`0.06–0.08` alpha) on below-the-fold tickets and manifests.
- **Border:** Hero placard uses an outer Warm Stucco Cream (`#f7e9d9`) border (`0.22cqw` desktop, `3px` mobile) with an inward cobalt inset shadow; below-the-fold cards use `2px solid` Roasted Coffee Ink (`#1d1510`) or Buseta Enamel Cobalt (`#0f4787`) paired with a matching `1.5px–2px` inset `outline` at `-6px` offset.
- **Internal Padding:** `1.5rem 1.65rem` on vaca tickets (`1.15rem 1rem` on mobile), `1.45rem 1.45rem` on manifests, and `2rem` on commission sheets (`1.35rem 1.15rem` on mobile).

### Inputs / Fields
Crisp chalk-paper entry wells built for unambiguous XLM quantities and 56-character Stellar public keys.
- **Style:** Chalk Ticket Paper (`#f8f7f4`) background, `8px` radius, `1.5px solid #3c342e` border, `44px–46px` height, `0.55rem 0.85rem` padding, and `600–700` tabular-numeral `Archivo` text in Roasted Coffee Ink (`#1d1510`). Composite XLM inputs house a borderless `<input>` alongside a muted `XLM` unit label inside the bordered container.
- **Focus:** Displays a `2.5px solid` Brick Vermilion (`#c73828`) focus ring (`2px` offset) and activates the live contribution preview stripe on the corresponding vaca route rail.
- **Error / Disabled:** Touched invalid fields (`:user-invalid` or `.field-invalid`) switch to `#9e2416` border over `#fdf3f0` paper and render an explicit `role="alert"` message below the field in `#8c1d11`.

### Navigation
- **Masthead:** Warm Stucco Cream (`#f7e9d9`) header pairing the `700`-weight `Barlow Condensed` `VacaCR` wordmark, horizontal `Archivo` section and Stellar Lab links (`500` weight, `0.22em` underline offset on hover), a bordered contract badge (`CAHS6X…FSHEP · Testnet`), and the cobalt `Conectar Wallet` button. Below `960px`, navigation links wrap onto row 2 and the compact Testnet contract badge stacks cleanly onto row 3 beneath the wordmark and wallet CTA.
- **Footer:** Full-bleed Buseta Enamel Cobalt (`#0f4787`) bar topped with a `3px solid` Maracuyá Route Gold (`#ebb02d`) stripe, presenting brand context and external verification links in Warm Stucco Cream (`#f7e9d9`).

### Route Progress Bar (`SALIDA → META`)
The signature component of VacaCR, visualizing pooled Soroban escrow progress as a physical bus route from `0.00 XLM` (`SALIDA`) to 100% of the target (`META`) flanked by `700`-weight `Barlow Condensed` endpoint numerals.
- **Track & Fill:** Full-pill (`999px`) Maracuyá Route Gold (`#ebb02d`) rail (`18px` tall on tickets, `1.95cqw` on hero, `17px` mobile hero) bordered in `1.5px solid #593e12`, filled from left to right with solid Brick Vermilion (`#c73828`) and capped by a vertical vermilion capsule pin (`12px × 26px`, `#4a150e` border).
- **Live Contribution Preview:** Hovering or focusing a vaca's contribution controls reveals a `-45deg` diagonal vermilion-and-gold striped preview bar (`clip-path` animated over `420ms` `cubic-bezier(0.16, 1, 0.3, 1)`)—plus a cream-and-vermilion ghost pin on the hero placard—showing the exact post-contribution percentage before signing.

## Do's and Don'ts

### Do:
- **Do** frame placards, vaca tickets, manifests, banners, and enamel buttons with the double-pinstripe motif—using inward `#f7e9d9` border + `inset` `#0f4787` shadow on bounded hero placards and `2px solid` border + inset `1.5px–2px` `outline` (`-5px` to `-6px` offset) below the fold.
- **Do** reserve Brick Vermilion (`#c73828`) exclusively for `Aportar XLM` contribution buttons, the active route fill and pin, validation errors, and `:focus-visible` focus rings.
- **Do** keep `font-variant-numeric: tabular-nums` enabled on `Archivo` copy and inputs, set `SALIDA` / `META` endpoint numerals and the `VacaCR` wordmark in `Barlow Condensed`, and format Stellar addresses and Soroban calls in `ui-monospace` `<code>` chips.
- **Do** connect XLM amount inputs to the `SALIDA → META` route preview (`420ms` `cubic-bezier(0.16, 1, 0.3, 1)`) while honoring `prefers-reduced-motion: reduce` by collapsing transitions to `0.01ms`.
- **Do** state both immutable contract outcomes (`100%` release to beneficiary vs. individual `refund()` after deadline) in plain Costa Rican Spanish alongside direct Stellar Lab and Stellar Expert links before asking for a signature.

### Don't:
- **Don't** introduce dark-mode crypto surfaces, neon purple/cyan gradients, `backdrop-filter` glassmorphism, or generic multi-card SaaS KPI grids.
- **Don't** set body paragraphs, form inputs, comparison cells, or error copy in `Jockey One` or `Barlow Condensed`; keep all multi-line prose, labels, and controls in `Archivo`.
- **Don't** use pure white (`#ffffff`) or pure black (`#000000`) for backgrounds or ink; build every surface from Warm Stucco Cream (`#f7e9d9`), Warm Ledger Parchment (`#fbf3e8`), Chalk Ticket Paper (`#f8f7f4`), and Roasted Coffee Ink (`#1d1510`).
- **Don't** nest bordered cards inside bordered cards; divide internal sections such as ticket metadata and onboarding stops with `1px solid` warm mortar hairlines (`#cbbba7`).
- **Don't** add decorative uppercase eyebrow kickers above section headings; let bold `Archivo` headings establish section hierarchy directly.
