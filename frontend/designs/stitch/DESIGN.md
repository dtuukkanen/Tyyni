---
name: Somatic Serenity
colors:
  surface: '#fbf9f5'
  surface-dim: '#dbdad6'
  surface-bright: '#fbf9f5'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3f0'
  surface-container: '#efeeea'
  surface-container-high: '#e9e8e4'
  surface-container-highest: '#e4e2df'
  on-surface: '#1b1c1a'
  on-surface-variant: '#414846'
  inverse-surface: '#30312e'
  inverse-on-surface: '#f2f1ed'
  outline: '#717976'
  outline-variant: '#c0c8c5'
  surface-tint: '#3f655c'
  primary: '#224840'
  on-primary: '#ffffff'
  primary-container: '#3a6057'
  on-primary-container: '#b0d9cd'
  inverse-primary: '#a6cfc4'
  secondary: '#43664d'
  on-secondary: '#ffffff'
  secondary-container: '#c2e9ca'
  on-secondary-container: '#476a51'
  tertiary: '#742914'
  on-tertiary: '#ffffff'
  tertiary-container: '#933f29'
  on-tertiary-container: '#ffc2b2'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#c2ebdf'
  primary-fixed-dim: '#a6cfc4'
  on-primary-fixed: '#00201a'
  on-primary-fixed-variant: '#274d45'
  secondary-fixed: '#c5eccc'
  secondary-fixed-dim: '#a9d0b1'
  on-secondary-fixed: '#00210e'
  on-secondary-fixed-variant: '#2c4e37'
  tertiary-fixed: '#ffdbd2'
  tertiary-fixed-dim: '#ffb4a1'
  on-tertiary-fixed: '#3c0800'
  on-tertiary-fixed-variant: '#7b2e19'
  background: '#fbf9f5'
  on-background: '#1b1c1a'
  surface-variant: '#e4e2df'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 44px
    fontWeight: '600'
    lineHeight: 52px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.015em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '500'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 28px
    letterSpacing: 0em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 17px
    fontWeight: '400'
    lineHeight: 26px
    letterSpacing: 0em
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0.005em
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.03em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-md: 1.5rem
  gutter-lg: 2rem
  margin: 1.25rem
  margin-md: 2rem
  margin-lg: 3rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system establishes a gentle, grounding sensory sanctuary tailored for nervous-system calming and somatic self-regulation. The interface avoids aggressive engagement tactics, hyper-stimulation, and punitive progress mechanics in favor of a restorative, guilt-free environment.

- **Brand Personality**: Nurturing, organic, restorative, steady, and patient.
- **Design Movement**: Soft Tactile Organicism merged with Gentle Warm Minimalism. Surfaces evoke natural smooth river pebbles, breathable linen textures, and diffused natural lighting.
- **Emotional Response**: Physiological deceleration, shoulder dropping, unclenched jaw, grounded focus, and atmospheric quietude.

## Colors

The palette is rooted in grounding earth pigments and calming vegetation, offering low-stimulation visual comfort with high legibility.

- **Primary (`#3a6057`) Eucalyptus**: Conveys respiratory calmness and somatic grounding. Used for primary interactive triggers, focal somatic exercises, and active states.
- **Secondary (`#43664d`) Calming Moss**: Enhances organic depth. Used for state indicators, gentle progress indicators, and breathing rhythms.
- **Tertiary (`#933f29` Deep Terracotta / `#ffdbd2` Soft Blush)**: Provides warm physical embodiment. Deep terracotta handles warm callouts, mindful check-ins, and heart-rate sync; soft blush serves as an atmospheric container fill.
- **Backgrounds (`#fbf9f6` Warm Off-White / `#efeeeb` Linen)**: Diffuse, non-reflective surfaces that prevent eye strain and screen fatigue.
- **Text & Outlines (`#1b1c1a` Dark Slate / `#717976` Soft Slate Outline)**: Softened high-contrast dark slate guarantees effortless readability without harsh pitch-black contrast. Outlines remain subtle and unobtrusive.

## Typography

Typography relies entirely on **Plus Jakarta Sans** for its friendly, organic geometric shapes, open counters, and human warmth. 

- Keep reading line-lengths between 45 and 65 characters to protect mental processing capacity.
- Generous line-heights across body copy ensure breathing room and reduce visual density.
- Avoid aggressive uppercase styling or tight tracking. Labels use slight positive letter spacing to maintain distinct legibility at small sizes.

## Layout & Spacing

The layout model emphasizes expansive negative space and uncompressed compositions.

- **Grid Strategy**: Fluid 4-column layout on mobile devices (`< 768px`), transitioning to an 8-column layout on tablet (`768px - 1024px`), and a centered 12-column layout on desktop (`> 1024px`) with a maximum content boundary of `1120px`.
- **Rhythm**: Built on a flexible 4px/8px incremental rhythm with wide exterior safe margins to prevent visual tension near screen edges.
- **Breathing Zones**: Interactive containers and somatic instruction segments must provide at least `space-lg` to `space-xl` gaps to keep the cognitive load exceptionally light.

## Elevation & Depth

Visual hierarchy uses tonal surface layering and ambient, ultra-diffused natural light over harsh drop shadows.

- **Tonal Layers**: Surface hierarchy progresses from canvas level (`#fbf9f6`) to secondary resting containers (`#efeeeb`), up to elevated somatic cards (`#ffffff` with 70% opacity).
- **Ambient Shadows**: Shadows are feathered, tinted with primary eucalyptus undertones (`rgba(58, 96, 87, 0.05)` to `rgba(58, 96, 87, 0.08)`), spanning 16px to 32px blur radii with minimal vertical offset (2px to 6px).
- **Ghost Boundaries**: Structural elements use low-opacity ghost borders (`#717976` at 20% opacity) rather than heavy bounding boxes to maintain an airy, unbounded atmosphere.

## Shapes

The shape system adopts pill-shaped structures and rounded pebble geometries.

- Full-pill geometry (`roundedness: 3`) applies to interactive buttons, sensory selection chips, search modules, and input capsules.
- Larger cards, audio player containers, and modal sheets mimic polished beach stones, utilizing soft radii ranging from `1.5rem` to `2.5rem`.
- Harsh right angles are strictly eliminated to foster a psychological feeling of safety and bodily relaxation.

## Components

### Buttons
- **Primary Pill**: Background of `#3a6057`, text in `#fbf9f6`, fully rounded pill radius, inner vertical padding of `space-md` and horizontal padding of `space-xl`.
- **Secondary Pebble**: Background of `#ffdbd2` at 60% opacity with `#933f29` label text, or background of `#efeeeb` with `#43664d` label text.
- **Ghost/Tertiary**: Fully transparent background, bordered with `#717976` at 25% opacity, text in `#3a6057`.

### Chips & Filters
- Compact pill-shaped modules for somatic tags (e.g., "Vagus Nerve", "Box Breathing", "Unclench").
- Inactive state: `#efeeeb` fill, `#1b1c1a` text, no border.
- Active state: `#3a6057` fill, `#ffffff` text with a subtle ambient glow.

### Lists & Navigation
- Borderless list items separated by generous vertical `space-md` gaps rather than dividing divider lines.
- Trailing somatic indicators use soft moss or terracotta dots rather than aggressive arrows.

### Checkboxes & Radio Controls
- Radio controls are tactile double-ring concentric pebbles. Outer ring `#717976` (30% opacity) filling to `#3a6057` with an interior warm linen core when engaged.
- Checkboxes use rounded squircle contours with soft check glyphs tinted in `#3a6057`.

### Input Fields
- Capsule pill inputs with `#efeeeb` background, gentle `#717976` border at 20% opacity, and generous horizontal padding (`space-lg`).
- Focus transitions into a `#3a6057` border at 50% opacity accompanied by an ambient eucalyptus blur ring.

### Cards & Pebble Pods
- Background of `#ffffff` at 85% opacity over linen `#efeeeb`.
- Soft pebble corners (`2rem` radius) with `space-lg` internal padding.
- Used for guided nervous-system resets, breathing exercises, and reflective audio experiences.

### Somatic Rhythm Pacer (App-Specific)
- A pulsing, concentric expanding circle using layered gradients of `#3a6057` and `#ffdbd2` designed for guiding inhalation, retention, and exhalation cycles without jarring timers or alarms.
