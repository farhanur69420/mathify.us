# Mathify.us Site Map & Information Architecture

A comprehensive guide to the site structure, user paths, and content organization.

---

## Site Overview

**Mathify** is a free, interactive educational platform offering step-by-step learning in Mathematics, Physics, and Civil Engineering. The site serves two primary user groups:

1. **Students** - Class 9-12 learners preparing for exams (SSC, HSC, O-Level, A-Level, SAT)
2. **Educators** - Teachers and tutors seeking teaching resources (planned)

---

## Main Navigation Structure

### Primary Subjects (Core Learning Paths)

```
/
├── /math                 → Mathematics (Class 9-12, fundamental concepts)
│   └── Full algebra, calculus, geometry, trigonometry guides
├── /physics              → Physics (Mechanics, waves, thermodynamics, electromagnetism)
│   └── Interactive simulations and step-by-step solutions
└── /civil                → Civil Engineering (RC design, structural analysis, traffic)
    └── Professional-level engineering education
```

### Exam Preparation (Goal-Oriented Paths)

#### SSC (School Certificate - Bangladesh)
```
/ssc                      → SSC Hub (overview and navigation)
├── /ssc-math-2025        → SSC Mathematics 2025 (All 9 boards)
├── /ssc-math-2024        → SSC Mathematics 2024 (All 9 boards)
├── /ssc-math-2023        → SSC Mathematics 2023 (All 9 boards)
├── /ssc-math-2022        → SSC Mathematics 2022 (All 9 boards)
├── /ssc-math-2021        → SSC Mathematics 2021 (All 9 boards)
└── /ssc-math-2020        → SSC Mathematics 2020 (All 9 boards)
```

#### Higher Secondary & International Exams (Coming Soon)
```
/hsc                      → HSC (Higher Secondary Certificate)
/o-level                  → O-Level (IGCSE equivalent)
/a-level                  → A-Level (Post-secondary)
/bcs                       → BCS (Bangladesh Civil Service exam prep)
/sat-prep                 → SAT Preparation (US college entrance)
```

### Discovery & Commerce

```
/explore                  → Explore (content discovery, advanced topics, research)
/shop                     → Merchandise & Digital Products
```

---

## User Journey & Information Paths

### Path 1: Student Wanting to Learn a Subject
**User Goal**: Learn mathematics from basics to advanced

```
Home (index)
  ↓ (Click "Start Learning Math")
/math
  ↓ (Browse topics)
Select concept (Algebra, Calculus, etc.)
  ↓ (Learn step-by-step)
Interactive visualizations & examples
  ↓ (Optional: practice problems)
```

### Path 2: Student Preparing for SSC Exam
**User Goal**: Practice previous year questions with solutions

```
Home (index)
  ↓ (Click subject card OR explore)
/ssc (SSC Hub)
  ↓ (Select year)
/ssc-math-2024
  ↓ (Select board, question type)
View MCQ/Creative Question with bilingual solution
  ↓ (Interact with visualizations)
```

### Path 3: Student in Different Exam Path
**User Goal**: Find resources for their specific exam

```
Home (index)
  ↓ (Explore/Coming Soon section)
/hsc, /o-level, /a-level, etc.
  ↓ (Browse available content)
```

### Path 4: Discovery User
**User Goal**: Browse available topics and find interesting content

```
Home (index)
  ↓ (Click "Explore All Topics")
/explore (Advanced topics, research, specialized content)
```

---

## Content Categories & Audience

### By Audience

#### Student-Focused Content
- **Mathematics** (/math)
- **Physics** (/physics)
- **Exam Preparation** (/ssc, /hsc, /o-level, /a-level, /sat-prep, /bcs)
- **Exploration** (/explore)

#### Educator-Focused Content (Future)
- Teaching guides and lesson plans
- Assessment materials
- Curriculum integration guides
- Professional development resources

#### Commercial
- **Shop** (/shop) - Merchandise, digital products, watches

### By Level

#### Foundation (Classes 9-10)
- Basic algebra
- Basic geometry
- Introductory physics
- Number systems

#### Advanced (Classes 11-12)
- Calculus
- Advanced algebra
- Modern physics
- Civil engineering fundamentals

#### Exam-Specific
- SSC preparation
- HSC preparation
- International exams (O-Level, A-Level, SAT)

---

## Navigation Recommendations

### Primary Navigation (All Pages)

The main navigation should reflect key user intents:

```
Home | Math | Physics | Civil | SSC | Shop | Explore
```

### Contextual Navigation

**On Subject Pages** (e.g., /math):
- Breadcrumb: Home > Math
- Sidebar: Topic categories (Algebra, Calculus, Geometry, etc.)
- Related: Links to Physics, Civil, and SSC prep

**On Exam Pages** (e.g., /ssc-math-2024):
- Breadcrumb: Home > SSC > Math 2024
- Year selector: Quick navigation to other years
- Board selector: Easy switching between boards
- Type selector: MCQ/Creative questions

**On Home Page** (/):
- Hero CTA: Clear main action
- Three main subject cards
- Exam prep section (SSC with quick year links)
- Coming Soon (HSC, O-Level, etc.)
- Explore section

### Breadcrumbs (Recommended Implementation)

```
Home > Subject > Topic
Home > SSC > Math 2024 > Questions
Home > Explore > Topic
```

---

## Search & Discoverability

### Content That Should Be Searchable

1. **Subjects**: Math, Physics, Civil
2. **Topics**: Algebra, Calculus, Geometry, Mechanics, etc.
3. **Formulas**: Mathematical and physics formulas
4. **Exam Types**: SSC, HSC, O-Level, A-Level
5. **Years**: 2020-2025 for exams
6. **Concepts**: Vectors, Integration, Derivatives, etc.

---

## Future Enhancements

### Educator Section (Planned)
- `/educators` - Hub for teaching resources
- `/educators/lesson-plans` - Downloadable lesson plans
- `/educators/curriculum` - Curriculum integration guides
- `/educators/assessments` - Assessment tools

### Advanced Filtering
- Filter by: Subject, Level, Topic, Format (text/video/interactive)
- Saved resources/bookmarks
- Learning paths (curated sequences)
- Progress tracking

### Personalization
- User accounts and profiles
- Learning preferences
- Saved favorites
- Learning history

---

## Site Structure Summary

```
mathify.us/
├── index.astro              [Home / Landing Page]
├── math.astro               [Math Subject Hub]
├── physics.astro            [Physics Subject Hub]
├── civil.astro              [Civil Engineering Subject Hub]
│
├── ssc.astro                [SSC Exam Hub]
├── ssc-math-2025.astro
├── ssc-math-2024.astro
├── ssc-math-2023.astro
├── ssc-math-2022.astro
├── ssc-math-2021.astro
├── ssc-math-2020.astro
│
├── hsc.astro                [Coming Soon]
├── o-level.astro            [Coming Soon]
├── a-level.astro            [Coming Soon]
├── bcs.astro                [Coming Soon]
├── sat-prep.astro           [Coming Soon]
│
├── explore.astro            [Content Discovery & Advanced Topics]
└── shop.astro               [Shop / Merchandise]
```

---

## Navigation Label Recommendations

### Clear Hierarchy

Instead of flat navigation, consider grouping:

**Option 1: Simple Flat (Current)**
```
Math | Physics | Civil | SSC | Shop | Explore
```

**Option 2: Grouped (Recommended for future)**
```
LEARN:
  - Math
  - Physics
  - Civil

EXAMS:
  - SSC (with dropdown for years)
  - HSC (Coming Soon)
  - O-Level (Coming Soon)
  - More...

MORE:
  - Explore
  - Shop
```

---

## Accessibility Notes

- All navigation should be keyboard accessible
- Mobile menu should have clear close/open states
- Breadcrumbs help users understand their location
- Descriptive labels over abbreviations (avoid too many codes)
- Consistent navigation placement (sticky header)

---

**Last Updated**: March 23, 2026
**Version**: 1.0
