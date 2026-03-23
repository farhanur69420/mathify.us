# Mathify.us Design System

A comprehensive guide to typography, spacing, colors, and visual hierarchy for consistent design across the platform.

---

## Typography

### Font Stack

**Primary (Headings & Display)**
```
Space Mono - Monospace (for brand personality and technical feel)
```

**Secondary (Body Text)**
```
Inter (Main layout pages)
DM Sans (Math concept pages)
Noto Sans Bengali (Bengali content)
```

### Heading Hierarchy

#### H1 - Page Titles
- **Font**: Space Mono, Bold (700)
- **Size**: Responsive scaling
  - Desktop: clamp(2.2rem, 5.5vw, 3.6rem)
  - Mobile: clamp(1.8rem, 4vw, 2.8rem)
- **Line Height**: 1.05-1.15
- **Letter Spacing**: -0.02em (slightly tighter)
- **Color**: Primary text or gradient
- **Usage**: Main page headings, hero section titles
- **Margin Bottom**: 0.6-1rem

#### H2 - Section Headers
- **Font**: Serif (Playfair Display) or sans-serif
- **Size**: 1.6rem (desktop), 1.3rem (mobile)
- **Font Weight**: 700-900
- **Line Height**: 1.15-1.3
- **Margin**: 2.5rem top, 1rem bottom
- **Border**: Optional bottom border (1-2px)
- **Usage**: Major section divisions
- **Color**: Accent color (teal) or primary text

#### H3 - Subsection Headers
- **Font**: DM Sans or Inter, Semi-bold (600)
- **Size**: 1.15rem
- **Line Height**: 1.4
- **Margin**: 1.8rem top, 0.8rem bottom
- **Usage**: Content subsections, topic headers

#### H4 - Emphasis
- **Font**: Same as body, Bold (600-700)
- **Size**: 1.05rem or slightly larger than body
- **Usage**: Minor emphasis, component headers

### Body Text

#### Standard Body
- **Font**: Inter or DM Sans, Regular (400)
- **Size**: 15px (base), scales to 13-14px on mobile
- **Line Height**: 1.6-1.8 (reading comfort)
- **Color**: Primary text (`--txt`)
- **Max Width**: 65-75 characters for optimal readability
- **Margin Bottom**: 1rem between paragraphs

#### Secondary Text / Muted Text
- **Color**: `--txt2` or `--mut` (lighter shade)
- **Size**: 0.9-1rem
- **Use Case**: Descriptions, helper text, metadata

#### Monospace Text (Code)
- **Font**: Space Mono, Regular or Bold
- **Size**: 0.9-1rem
- **Usage**: Code snippets, technical terms, labels
- **Background**: Subtle background with border
- **Padding**: 0.2-0.5rem horizontal

### Text Variants

#### Labels / Tags
- **Font**: Space Mono, Bold (700)
- **Size**: 0.6-0.72rem
- **Letter Spacing**: 0.08-0.15em (uppercase emphasis)
- **Text Transform**: UPPERCASE
- **Color**: Secondary color (amber)
- **Usage**: Category tags, section labels

#### Captions / Helper Text
- **Font**: Space Mono or sans-serif, Regular
- **Size**: 0.7-0.85rem
- **Color**: Muted (`--mut`)
- **Usage**: Figure captions, form hints, timestamps

---

## Spacing

### Spacing Scale (8px Base Grid)

```
0    = 0
1    = 0.25rem (4px)
2    = 0.5rem (8px)
3    = 0.75rem (12px)
4    = 1rem (16px)
6    = 1.5rem (24px)
8    = 2rem (32px)
12   = 3rem (48px)
16   = 4rem (64px)
20   = 5rem (80px)
```

**Usage**: All spacing should use multiples of 0.5rem (8px) for consistency.

### Padding Guidelines

#### Component Padding
- **Small Components**: 0.5-0.75rem (8-12px)
- **Medium Components**: 1-1.5rem (16-24px)
- **Large Components**: 1.5-2.5rem (24-40px)

#### Card/Box Padding
- **Compact**: 1rem
- **Standard**: 1.5rem
- **Spacious**: 2-2.5rem

#### Section Padding
- **Horizontal**: 2rem (desktop), 1.5rem (tablet), 1rem (mobile)
- **Vertical**: 2.5-4rem between major sections
- **Max Content Width**: 900-1200px

### Margin Guidelines

#### Between Vertical Elements
- **Tight**: 0.5rem
- **Comfortable**: 1rem
- **Spaced**: 1.5-2rem
- **Major Section Break**: 3-4rem

#### Between Horizontal Elements
- **Gutter**: 0.8-1.2rem (component spacing)
- **Section Gap**: 1.5-2rem

### Line Height & Reading Rhythm

| Element | Line Height | Notes |
|---------|-------------|-------|
| Headings | 1.05-1.3 | Tighter for visual impact |
| Body Text | 1.6-1.8 | Generous for readability |
| Lists | 1.7-1.9 | Extra space for scanning |
| Code | 1.8+ | More space for clarity |

---

## Color System

### Primary Colors
```
Teal (#4ec9b0)       - Primary action, interactive elements
Amber (#d4a94a)      - Secondary action, accents
Rust (#c25a3b)       - Alerts, errors, tertiary accents
```

### Neutral Scale
```
Background (--bg):     #0a0a0f
Surface (--surf):      #111118
Surface 2 (--surf2):   #1a1a24
Border (--bdr):        #222233
Muted Text (--mut):    #5a6070
Text (--txt):          #e0e4ef
Text 2 (--txt2):       #a0a8be
```

### Usage Guidelines
- **Backgrounds**: Stick to --bg, --surf, --surf2
- **Text**: Use --txt for primary, --txt2 for secondary, --mut for labels
- **Accents**: --teal for primary actions, --amb for secondary
- **Borders**: Always use --bdr or --bdr2

---

## Component Spacing Patterns

### Navigation Bar
- **Height**: 50-54px
- **Horizontal Padding**: 1-2rem
- **Item Gap**: 1.4-1.5rem
- **Logo Margin**: No right margin (flexbox auto)

### Hero Section
- **Padding Top**: 4-6rem
- **Padding Bottom**: 3-4rem
- **CTA Gap**: 1rem
- **Max Width**: 800-900px

### Card Components
- **Padding**: 1.5-2.5rem
- **Border**: 1-1.5px solid --bdr
- **Border Radius**: 6-8px
- **Shadow**: Minimal (reserved for hover states)

### Form Elements
- **Height**: 44px minimum (touch-friendly)
- **Padding**: 0.6-0.9rem horizontal, 0.5-0.8rem vertical
- **Border Radius**: 3-6px
- **Gap Between Fields**: 1-1.5rem

### Lists & Table Spacing
- **Item Padding**: 0.75-1rem vertical
- **Item Gap**: 0.3-0.5rem (borders can substitute)
- **Cell Padding**: 0.8-1.3rem

---

## Responsive Breakpoints

### Mobile-First Breakpoints
```
320px   - Extra small devices
480px   - Small phones
600px   - Medium phones / large mobile
768px   - Tablets
900px   - Large tablets / small desktops
1200px  - Desktop
1920px  - Large desktop
```

### Responsive Adjustments

#### Typography
| Breakpoint | Body Size | Heading Reduction |
|-----------|-----------|------------------|
| Desktop   | 15px      | Base sizes       |
| Tablet    | 14px      | 90% of base      |
| Mobile    | 13px      | 80% of base      |

#### Spacing
| Breakpoint | Horizontal Padding | Vertical Spacing |
|-----------|------------------|-----------------|
| Desktop   | 2rem             | Full scale      |
| Tablet    | 1.5rem           | 90% scale       |
| Mobile    | 1rem             | 80% scale       |

---

## Consistency Checklist

### Typography
- [ ] All H1 use consistent font and sizing
- [ ] All H2 elements have consistent styling
- [ ] Body text uses proper line height (1.6+)
- [ ] Code blocks use monospace fonts
- [ ] Labels use uppercase Space Mono
- [ ] Heading hierarchy clearly defined

### Spacing
- [ ] All padding uses multiples of 0.5rem
- [ ] Section margins are consistent
- [ ] Component gaps follow spacing scale
- [ ] Mobile padding reduced proportionally
- [ ] Vertical rhythm is maintained

### Colors
- [ ] All text uses defined color variables
- [ ] Accent colors used consistently
- [ ] Borders use --bdr variables
- [ ] Background hierarchy respected
- [ ] Sufficient color contrast (WCAG AA)

### Components
- [ ] Cards have consistent padding/borders
- [ ] Buttons have consistent sizing
- [ ] Forms have proper spacing
- [ ] Navigation is aligned
- [ ] Modals/overlays styled consistently

---

## Implementation Best Practices

### CSS Variables
Use CSS custom properties for all values:
```css
:root {
  --spacing: 1rem;
  --font-size-body: 15px;
  --font-size-small: 0.85rem;
  --border-radius: 6px;
}

body {
  font-size: var(--font-size-body);
  line-height: 1.6;
}
```

### Utility Classes
Keep common patterns as utilities:
```css
.text-small { font-size: 0.85rem; }
.text-muted { color: var(--txt2); }
.spacing-lg { margin-bottom: 2rem; }
.card-padding { padding: 1.5rem; }
```

### Media Query Pattern
```css
@media (max-width: 768px) {
  /* Scale down typography and spacing */
}

@media (max-width: 600px) {
  /* Further adjustments for small screens */
}

@media (max-width: 480px) {
  /* Extreme scaling for tiny screens */
}
```

---

## Visual Examples

### Typography Hierarchy
```
H1 Main Heading (2.2-3.6rem)
↓
Descriptive Paragraph (1rem body text, 1.6 line height)
↓
H2 Section Header (1.6rem, teal color)
↓
Body Content with proper spacing
↓
H3 Subsection (1.15rem)
↓
Regular paragraph text
```

### Component Spacing
```
┌─────────────────────────┐
│      Navigation         │  52px height
├─────────────────────────┤
│                         │
│   Hero Section          │  6rem padding top
│   (Max Width 800px)     │  4rem padding bottom
│                         │
├─────────────────────────┤
│                         │
│ Content Section         │  2rem horizontal padding
│ (Max Width 900px)       │  3rem vertical spacing
│                         │
└─────────────────────────┘
```

---

## Future Enhancements

1. **Dark/Light Theme Support** - Extend color system
2. **Animation Library** - Standard transition durations
3. **Icon System** - Consistent icon sizing
4. **Component Variants** - Documented UI patterns
5. **Accessibility Standards** - WCAG compliance checklist

---

**Version**: 1.0
**Last Updated**: March 23, 2026
