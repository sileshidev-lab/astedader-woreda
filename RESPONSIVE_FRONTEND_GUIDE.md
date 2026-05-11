Responsive Frontend CSS & Tailwind Guide
1. Core Philosophy
Mobile-first always. Write base styles for the smallest screen, then override upward. Unprefixed Tailwind classes apply everywhere — md: means "at md and above", not "only on medium".
Three tools do 90% of the work:

clamp() for fluid sizing without breakpoint bloat
Container queries for component-level responsiveness
Tailwind breakpoint prefixes for layout shifts


2. Tailwind Breakpoint System
Default Tailwind breakpoints use min-width and are mobile-first — every utility applies at that breakpoint and above. Tailwind CSS
Default breakpoints + what to add
js// tailwind.config.js
export default {
  theme: {
    screens: {
      'xs':  '375px',   // small phones  — Samsung Galaxy, iPhone SE
      'sm':  '640px',   // large phones  — iPhone Pro Max landscape
      'md':  '768px',   // tablets        — iPad portrait
      'lg':  '1024px',  // laptops        — MacBook 13"
      'xl':  '1280px',  // desktops       — 1080p monitors
      '2xl': '1536px',  // large desktops — 1440p
      '3xl': '1920px',  // full HD        — 1080p TVs, big monitors
      '4xl': '2560px',  // ultra-wide     — 4K, ultrawide displays
    }
  }
}
Mental model — one rule
xs      sm      md      lg      xl      2xl     3xl     4xl
375     640     768     1024    1280    1536    1920    2560
|-------|-------|-------|-------|-------|-------|-------|---->
phone   phablet tablet  laptop  desk    wide    FHD     4K
You only need to specify when a utility should START taking effect, not when it should stop. You don't need to specify a style at every breakpoint — just the transitions. Tailwind CSS

3. Fluid Sizing with clamp()
clamp() lets you describe responsive behavior in one line. It's supported by 96% of browsers and works for any CSS property that accepts a unit. DEV Community
Formula
cssclamp(MIN, PREFERRED, MAX)
/*    ↑    ↑           ↑
      floor fluid-val  ceiling  */
Token sheet — use these everywhere
css:root {
  /* ── Typography ── */
  --text-xs:    clamp(0.65rem, 0.6rem + 0.2vw,  0.75rem);
  --text-sm:    clamp(0.8rem,  0.75rem + 0.25vw, 0.9rem);
  --text-base:  clamp(0.9rem,  0.82rem + 0.35vw, 1rem);
  --text-lg:    clamp(1rem,    0.9rem + 0.5vw,   1.25rem);
  --text-xl:    clamp(1.25rem, 1rem + 1vw,       1.75rem);
  --text-2xl:   clamp(1.5rem,  1.2rem + 1.5vw,   2.25rem);
  --text-3xl:   clamp(2rem,    1.5rem + 2.5vw,   3.5rem);

  /* ── Spacing ── */
  --space-xs:   clamp(4px,   0.5vw,  8px);
  --space-sm:   clamp(8px,   1vw,    16px);
  --space-md:   clamp(12px,  1.5vw,  24px);
  --space-lg:   clamp(20px,  2.5vw,  40px);
  --space-xl:   clamp(32px,  4vw,    64px);
  --space-2xl:  clamp(48px,  6vw,    96px);

  /* ── Page shell ── */
  --shell-x:    clamp(12px,  4vw,    64px);
  --shell-y:    clamp(12px,  2vw,    32px);
  --content-max: min(100%, 1400px);

  /* ── Sidebar ── */
  --sidebar-w:  clamp(200px, 18vw,   280px);
}
In Tailwind — arbitrary clamp values
html<!-- fluid heading -->
<h1 class="text-[clamp(1.5rem,3vw,3rem)] font-black">Title</h1>

<!-- fluid padding -->
<section class="px-[clamp(12px,4vw,64px)] py-[clamp(16px,2vw,40px)]">

<!-- fluid max-width container -->
<div class="w-full max-w-[min(100%,1400px)] mx-auto">

4. Page Shell — The Outermost Layout
Every page follows this shell structure. Get this right and everything inside behaves.
CSS version
css/* ── Root shell ── */
.app-shell {
  display: grid;
  grid-template-columns: var(--sidebar-w) 1fr;
  grid-template-rows: auto 1fr;
  min-height: 100dvh;          /* dvh = handles mobile browser chrome */
  overflow: hidden;
}

/* ── Sidebar ── */
.sidebar {
  grid-row: 1 / -1;            /* spans full height */
  position: sticky;
  top: 0;
  height: 100dvh;
  overflow-y: auto;
  background: var(--sidebar-color);
  width: var(--sidebar-w);
}

/* ── Top bar ── */
.topbar {
  grid-column: 2;
  position: sticky;
  top: 0;
  z-index: 50;
  height: 56px;
  border-bottom: 1px solid var(--border);
}

/* ── Page content ── */
.page-content {
  grid-column: 2;
  padding-inline: var(--shell-x);
  padding-block: var(--shell-y);
  overflow-y: auto;
  min-height: 0;               /* critical for flex/grid children */
}

/* ── Collapse sidebar on tablet and below ── */
@media (max-width: 1023px) {
  .app-shell {
    grid-template-columns: 1fr;   /* sidebar goes off-grid */
  }

  .sidebar {
    position: fixed;
    left: 0; top: 0;
    z-index: 200;
    transform: translateX(-100%);
    transition: transform 0.2s ease;
  }

  .sidebar.open {
    transform: translateX(0);
  }

  .page-content {
    grid-column: 1;
  }
}
Tailwind version
html<!-- App shell -->
<div class="grid grid-cols-[280px_1fr] lg:grid-cols-[280px_1fr]
            grid-cols-[1fr] min-h-dvh overflow-hidden">

  <!-- Sidebar: hidden on mobile, fixed drawer; visible on lg+ -->
  <aside class="
    fixed inset-y-0 left-0 z-50 w-[280px]
    -translate-x-full lg:translate-x-0 lg:static
    transition-transform duration-200
    bg-[#00344b] overflow-y-auto
  " id="sidebar">
    <!-- nav items -->
  </aside>

  <!-- Main column -->
  <div class="flex flex-col min-h-dvh min-w-0">

    <!-- Topbar -->
    <header class="sticky top-0 z-40 h-14 border-b
                   bg-white flex items-center px-4 lg:px-6 shrink-0">
    </header>

    <!-- Scrollable content -->
    <main class="flex-1 overflow-y-auto
                 px-[clamp(12px,4vw,48px)]
                 py-[clamp(12px,2vw,32px)]">
    </main>

  </div>
</div>

5. Stat / KPI Cards
These appear on every dashboard. The key: auto-fit grid so they reflow automatically.
css/* ── The grid ── */
.stat-grid {
  display: grid;
  gap: var(--space-md);
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr));
}

/* ── Single card ── */
.stat-card {
  border: 1px solid var(--border);
  background: var(--surface);
  padding: var(--space-md);
  position: relative;
  overflow: hidden;
}

.stat-label {
  font-size: var(--text-xs);
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
}

.stat-value {
  font-size: clamp(1.5rem, 2.5vw, 2.25rem);
  font-weight: 900;
  line-height: 1.1;
  margin: 6px 0 4px;
}

.stat-sub {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

/* ── On phones: 2 columns max ── */
@media (max-width: 639px) {
  .stat-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
html<!-- Tailwind -->
<div class="grid gap-4
            grid-cols-2
            sm:grid-cols-2
            md:grid-cols-3
            xl:grid-cols-4">
  <div class="border border-gray-200 bg-white p-4">
    <p class="text-[11px] font-black uppercase tracking-widest text-gray-500">Total</p>
    <p class="text-[clamp(1.5rem,2.5vw,2rem)] font-black text-blue-900 my-1">142</p>
    <p class="text-xs text-gray-400">All time</p>
  </div>
</div>

6. Filter Toolbars
The most common broken pattern: filters that wrap badly on mid-size screens.
Rules

Search input: flex: 1 1 auto — takes available space
Selects: flex: 0 0 auto; min-width: 130px — never shrink below label width
Action buttons: flex-shrink: 0 — never squish
On mobile: filters collapse behind a toggle button

css/* ── Toolbar container ── */
.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: var(--surface-low);
  border-bottom: 1px solid var(--border);
}

/* ── Search ── */
.toolbar-search {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1 1 220px;         /* grows, minimum 220px */
  min-width: 160px;
  height: 38px;
  padding: 0 12px;
  border: 1px solid var(--border);
  background: var(--surface);
}

.toolbar-search:focus-within {
  border-color: var(--primary);
  outline: 2px solid color-mix(in srgb, var(--primary) 20%, transparent);
}

.toolbar-search input {
  flex: 1;
  border: none;
  background: transparent;
  outline: none;
  font-size: 14px;
}

/* ── Filter select ── */
.toolbar-select {
  flex: 0 0 auto;
  min-width: 130px;
  height: 38px;
  padding: 0 10px;
  border: 1px solid var(--border);
  background: var(--surface);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

/* ── Separator ── */
.toolbar-sep {
  width: 1px;
  height: 24px;
  background: var(--border-light);
  flex-shrink: 0;
}

/* ── Mobile: collapse filters ── */
@media (max-width: 767px) {
  .toolbar-filters {
    display: none;
    width: 100%;
    flex-wrap: wrap;
    gap: 8px;
  }

  .toolbar-filters.open {
    display: flex;
  }

  /* each filter takes half width on mobile */
  .toolbar-filters .toolbar-select {
    flex: 1 1 calc(50% - 4px);
    min-width: 0;
  }

  /* search takes full row */
  .toolbar-search {
    flex: 1 1 100%;
  }

  /* toggle button shows on mobile */
  .toolbar-filter-toggle {
    display: flex;
  }
}

@media (min-width: 768px) {
  .toolbar-filter-toggle { display: none; }
  .toolbar-filters { display: contents; }
}
html<!-- Tailwind filter toolbar -->
<div class="flex flex-wrap items-center gap-2 p-3 bg-gray-50 border-b">

  <!-- Search — grows -->
  <div class="flex items-center gap-2 flex-1 min-w-[160px] h-9
              px-3 border border-gray-200 bg-white focus-within:border-blue-500">
    <svg class="w-4 h-4 text-gray-400 shrink-0"><!-- icon --></svg>
    <input class="flex-1 border-none bg-transparent outline-none text-sm"
           placeholder="Search..."/>
  </div>

  <!-- Filters: hidden on mobile, shown md+ OR when toggle active -->
  <div class="hidden md:contents" id="filters">
    <select class="h-9 px-3 border border-gray-200 bg-white text-sm font-semibold
                   min-w-[130px] flex-shrink-0">
      <option>Type: All</option>
    </select>

    <select class="h-9 px-3 border border-gray-200 bg-white text-sm font-semibold
                   min-w-[130px] flex-shrink-0">
      <option>Status: All</option>
    </select>

    <div class="w-px h-6 bg-gray-200 hidden md:block"></div>
  </div>

  <!-- Mobile filter toggle -->
  <button class="md:hidden h-9 px-3 border border-gray-200 text-sm font-bold"
          onclick="document.getElementById('filters').classList.toggle('hidden')">
    Filters
  </button>

  <!-- Primary action — never shrinks -->
  <button class="h-9 px-4 bg-[#00658d] text-white text-sm font-black shrink-0">
    + New
  </button>
</div>

7. Dropdowns & Popovers
Rules

Never use position: fixed for dropdowns — breaks inside transformed parents
Use position: absolute + z-index on the trigger's positioned ancestor
Flip direction when near viewport edge with JS or @starting-style
Width: min(320px, calc(100vw - 2rem)) — never overflows on phone

css/* ── Trigger wrapper ── */
.dropdown-wrap {
  position: relative;
  display: inline-block;
}

/* ── Panel ── */
.dropdown-panel {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 200;
  width: min(280px, calc(100vw - 24px));
  background: var(--surface);
  border: 1px solid var(--border);
  box-shadow: 0 8px 24px rgba(0,0,0,0.12);
  border-radius: 8px;
  overflow: hidden;

  /* Animation */
  opacity: 0;
  transform: translateY(-6px);
  pointer-events: none;
  transition: opacity 0.15s, transform 0.15s;
}

.dropdown-wrap.open .dropdown-panel {
  opacity: 1;
  transform: translateY(0);
  pointer-events: all;
}

/* ── Flip right-aligned when near right edge ── */
.dropdown-panel.align-right {
  left: auto;
  right: 0;
}

/* ── Items ── */
.dropdown-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  cursor: pointer;
  transition: background 0.1s;
}

.dropdown-item:hover { background: var(--surface-low); }
.dropdown-item.danger { color: var(--danger); }

/* ── On mobile: bottom sheet instead ── */
@media (max-width: 639px) {
  .dropdown-panel {
    position: fixed;
    bottom: 0; left: 0; right: 0;
    top: auto;
    width: 100%;
    border-radius: 16px 16px 0 0;
    transform: translateY(100%);
    max-height: 60dvh;
    overflow-y: auto;
  }

  .dropdown-wrap.open .dropdown-panel {
    transform: translateY(0);
  }
}

8. Data Tables
Tables are the hardest component to make responsive. Three strategies:
Strategy A — Horizontal scroll (simplest, best for dense data)
css.table-scroll-wrap {
  overflow-x: auto;
  overscroll-behavior-inline: contain;
  -webkit-overflow-scrolling: touch;
  border: 1px solid var(--border);
}

/* Enforce minimum width so columns don't collapse */
.table-scroll-wrap table {
  width: max(100%, 640px);   /* never narrower than 640px */
  border-collapse: collapse;
  font-size: 14px;
}

th {
  background: var(--surface-low);
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  padding: 10px 14px;
  white-space: nowrap;        /* headers never wrap */
  border-bottom: 2px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 2;
}

td {
  padding: 10px 14px;
  border-bottom: 1px solid var(--border-light);
  font-size: 13px;
  color: var(--text);
}

/* fixed layout for column control */
table { table-layout: fixed; }
Strategy B — Card list on mobile (best UX)
css/* Hide table on mobile, show cards */
@media (max-width: 767px) {
  .data-table { display: none; }
  .data-cards { display: flex; flex-direction: column; gap: 8px; }
}

@media (min-width: 768px) {
  .data-table { display: table; }
  .data-cards { display: none; }
}

.data-card {
  border: 1px solid var(--border);
  background: var(--surface);
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.data-card-title {
  font-size: 14px;
  font-weight: 800;
  color: var(--text);
}

.data-card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 12px;
  color: var(--text-muted);
}
Strategy C — Priority columns (hide less important cols on small screens)
css/* Default: show all */
.col-id       { display: table-cell; }
.col-name     { display: table-cell; }
.col-status   { display: table-cell; }
.col-date     { display: table-cell; }
.col-actions  { display: table-cell; }

/* Tablet: hide secondary */
@media (max-width: 1023px) {
  .col-id   { display: none; }
  .col-date { display: none; }
}

/* Mobile: only essentials */
@media (max-width: 639px) {
  .col-status { display: none; }
}

9. Charts — Responsive Patterns
Use clamp() to keep chart containers readable across all screen sizes without abrupt changes at breakpoints. uxpin
The core problem
Charts rendered by Chart.js / Recharts / D3 need an explicit pixel height. They ignore height: 100% unless the parent has a defined height.
css/* ── Chart wrapper — always explicit height ── */
.chart-container {
  position: relative;
  width: 100%;
  height: clamp(200px, 35vh, 400px);  /* fluid but bounded */
  min-height: 180px;
}

.chart-container canvas,
.chart-container svg {
  position: absolute;
  inset: 0;
  width: 100% !important;
  height: 100% !important;
}
Chart grid — multi-chart dashboards
css.chart-grid {
  display: grid;
  gap: var(--space-md);

  /* Default: 2 columns */
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

/* Full width chart spans both columns */
.chart-full { grid-column: 1 / -1; }

/* Tablet: still 2 columns unless very narrow */
@media (max-width: 900px) {
  .chart-grid { grid-template-columns: 1fr; }
  .chart-full { grid-column: 1; }
}

/* Laptop+: can go 3 columns */
@media (min-width: 1280px) {
  .chart-grid {
    grid-template-columns: 2fr 1fr 1fr;
  }
}

/* 4K: cap width, don't stretch to 2560px */
@media (min-width: 1920px) {
  .chart-grid {
    max-width: 1600px;
    margin-inline: auto;
  }
}
Tailwind chart layout
html<div class="grid gap-4
            grid-cols-1
            md:grid-cols-2
            xl:grid-cols-[2fr_1fr_1fr]">

  <!-- Main chart — full width on all sizes -->
  <div class="md:col-span-2 xl:col-span-3
              border border-gray-200 bg-white p-4 rounded-lg">
    <h3 class="text-xs font-black uppercase tracking-wider text-gray-500 mb-3">
      Performance Over Time
    </h3>
    <div class="relative w-full h-[clamp(200px,30vh,360px)]">
      <canvas id="mainChart"></canvas>
    </div>
  </div>

  <!-- Secondary charts -->
  <div class="border border-gray-200 bg-white p-4 rounded-lg">
    <div class="relative w-full h-[clamp(160px,20vh,240px)]">
      <canvas id="chart2"></canvas>
    </div>
  </div>

</div>
Chart.js — always set these options
jsconst chart = new Chart(ctx, {
  options: {
    responsive: true,
    maintainAspectRatio: false,  // critical — lets CSS control height
    plugins: {
      legend: {
        display: window.innerWidth > 640,  // hide legend on phone
      }
    },
    scales: {
      x: {
        ticks: {
          // fewer ticks on small screens
          maxTicksLimit: window.innerWidth < 640 ? 4 : 8,
          font: { size: window.innerWidth < 640 ? 10 : 12 }
        }
      }
    }
  }
})

// Re-render on resize
window.addEventListener('resize', () => chart.resize())

10. Detail / Form Pages
css/* ── Two-column detail layout ── */
.detail-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 360px);
  gap: var(--space-lg);
  align-items: start;
}

/* Collapse to single column on tablet */
@media (max-width: 1023px) {
  .detail-layout {
    grid-template-columns: 1fr;
  }
}

/* ── Field pairs (label + value) ── */
.field-pair {
  display: grid;
  grid-template-columns: minmax(120px, 30%) 1fr;
  gap: 8px 16px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--border-light);
  font-size: 13px;
  align-items: baseline;
}

/* Stack on small screens */
@media (max-width: 480px) {
  .field-pair {
    grid-template-columns: 1fr;
    gap: 2px;
  }
}

.field-label {
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
}

/* ── Form grid ── */
.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr));
  gap: var(--space-md);
}

.form-field-full { grid-column: 1 / -1; }

11. Ultra-Wide & 4K Guard
In 2025, responsive design is about fluidity and adaptability over rigid breakpoints — your layout needs to handle ultra-wide screens without stretching into unreadability. LogRocket
Never let content stretch to 2560px wide. Always cap it:
css/* ── Max-width guard ── */
.aw-guard {
  width: min(100%, 1600px);
  margin-inline: auto;
}

/* ── Or fluid with padding on ultra-wide ── */
.page-content {
  padding-inline: clamp(16px, 5vw, 160px);  /* adds massive padding on 4K */
}

/* ── Tailwind version ── */
/* max-w-[1600px] mx-auto */

/* ── 4K: increase base font size ── */
@media (min-width: 2560px) {
  :root { font-size: 18px; }  /* scale up the whole rem system */
}

/* ── FHD: slight bump ── */
@media (min-width: 1920px) {
  :root { font-size: 16.5px; }
}

12. The Complete Breakpoint Rulebook
What changes at each breakpoint
ViewportLayout changeNavTablesChartsFilters< 375pxSingle col, 100% everythingHidden drawerScroll wrap180px hAll hidden375–639px (xs–sm)Single colHidden drawerScroll wrap OR cards200px hToggle button640–767px (sm)Single col, wider paddingHidden drawerCards preferred220px h2-col grid768–1023px (md)Single col, more spacingHidden drawerFull table260px hInline row1024–1279px (lg)Sidebar appears, 2-colSticky sidebarFull table sticky h280px hFull inline1280–1535px (xl)Sidebar + wide contentSticky sidebarFull table320px hFull inline1536–1919px (2xl)Multi-panelSticky sidebarFull table360px hFull inline1920px+ (3xl–4xl)Guard cap kicks in, centeredWider sidebarFull table400px hFull inline

13. Complete Tailwind Config
js// tailwind.config.js
export default {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './index.html'],

  theme: {
    screens: {
      'xs':  '375px',
      'sm':  '640px',
      'md':  '768px',
      'lg':  '1024px',
      'xl':  '1280px',
      '2xl': '1536px',
      '3xl': '1920px',
      '4xl': '2560px',
    },

    extend: {
      fontFamily: {
        sans: ['Inter', 'Public Sans', 'system-ui', 'sans-serif'],
        mono: ['Cascadia Code', 'Fira Code', 'monospace'],
      },

      fontSize: {
        // All fluid via clamp
        'fluid-xs':   ['clamp(0.65rem, 0.6rem + 0.2vw, 0.75rem)',  { lineHeight: '1.4' }],
        'fluid-sm':   ['clamp(0.8rem, 0.75rem + 0.25vw, 0.9rem)',  { lineHeight: '1.5' }],
        'fluid-base': ['clamp(0.9rem, 0.82rem + 0.35vw, 1rem)',    { lineHeight: '1.6' }],
        'fluid-lg':   ['clamp(1rem, 0.9rem + 0.5vw, 1.25rem)',     { lineHeight: '1.4' }],
        'fluid-xl':   ['clamp(1.25rem, 1rem + 1vw, 1.75rem)',      { lineHeight: '1.3' }],
        'fluid-2xl':  ['clamp(1.5rem, 1.2rem + 1.5vw, 2.25rem)',   { lineHeight: '1.2' }],
        'fluid-3xl':  ['clamp(2rem, 1.5rem + 2.5vw, 3.5rem)',      { lineHeight: '1.1' }],
        'eyebrow':    ['11px', { lineHeight: '1.3', letterSpacing: '0.08em', fontWeight: '800' }],
        'table-cell': ['13px', { lineHeight: '1.4' }],
      },

      spacing: {
        'shell-x': 'clamp(12px, 4vw, 64px)',
        'shell-y': 'clamp(12px, 2vw, 32px)',
        'sidebar': 'clamp(200px, 18vw, 280px)',
        'guard':   'min(100%, 1600px)',
      },

      maxWidth: {
        'guard':    '1600px',
        'content':  '900px',
        'readable': '65ch',
      },

      width: {
        'sidebar':  'clamp(200px, 18vw, 280px)',
        'popover':  'min(320px, calc(100vw - 24px))',
        'drawer':   'min(480px, 96vw)',
      },

      height: {
        'topbar': '56px',
        'screen': '100dvh',         // dynamic viewport height
      },

      minHeight: {
        'screen': '100dvh',
      },

      borderRadius: {
        'xs': '2px',
        'sm': '4px',
        'md': '6px',
        'lg': '8px',
        'xl': '12px',
      },

      zIndex: {
        'dropdown': '100',
        'sticky':   '200',
        'overlay':  '300',
        'modal':    '400',
        'toast':    '500',
      },
    },
  },

  plugins: [],
}

14. CSS Custom Properties — The Token File
Keep this in one file. Import it everywhere.
css/* tokens.css  —  import this first in your main.css */
:root {
  /* ── Palette ── */
  --primary:          #00658d;
  --primary-strong:   #004c6b;
  --primary-darkest:  #00344b;
  --primary-soft:     #c6e7ff;
  --on-primary:       #ffffff;
  --secondary:        #b80049;
  --amber:            #d97706;
  --amber-bg:         rgba(217,119,6,0.1);
  --teal:             #0d9488;
  --teal-bg:          rgba(13,148,136,0.1);
  --magenta:          #b8006c;
  --magenta-bg:       rgba(184,0,108,0.08);
  --danger:           #ba1a1a;
  --danger-bg:        #ffdad6;
  --success:          #0d6e4d;
  --success-bg:       #d4f5e8;
  --yellow:           #fed000;
  --yellow-text:      #6f5900;
  --yellow-bg:        rgba(254,208,0,0.18);

  /* ── Surfaces ── */
  --bg:               #f8f9fa;
  --surface:          #ffffff;
  --surface-low:      #f2f4f6;
  --surface-container:#eceef2;
  --surface-high:     #e7e8ea;

  /* ── Text ── */
  --text:             #191c1d;
  --text-muted:       #40484e;
  --text-variant:     #40484e;

  /* ── Borders ── */
  --border:           #d7dee5;
  --border-card:      #e9ecef;
  --border-light:     #f1f3f5;

  /* ── Fluid spacing ── */
  --space-xs:   clamp(4px,   0.5vw, 8px);
  --space-sm:   clamp(8px,   1vw,   16px);
  --space-md:   clamp(12px,  1.5vw, 24px);
  --space-lg:   clamp(20px,  2.5vw, 40px);
  --space-xl:   clamp(32px,  4vw,   64px);
  --shell-x:    clamp(12px,  4vw,   64px);
  --shell-y:    clamp(12px,  2vw,   32px);
  --sidebar-w:  clamp(200px, 18vw,  280px);
}

/* ── Dark mode: swap surfaces only ── */
[data-theme="dark"] {
  --bg:               #121417;
  --surface:          #1c1f23;
  --surface-low:      #16191d;
  --surface-container:#25292e;
  --surface-high:     #2d3134;
  --text:             #eff1f2;
  --text-muted:       #bfc7cf;
  --border:           #3d454d;
  --border-card:      #3a4149;
  --border-light:     #2d3134;
  --primary-soft:     rgba(0,101,141,0.28);
  --amber-bg:         rgba(217,119,6,0.18);
  --teal-bg:          rgba(13,148,136,0.18);
  --magenta-bg:       rgba(184,0,108,0.2);
  --danger-bg:        rgba(186,26,26,0.18);
  --success-bg:       rgba(13,110,77,0.18);
  --yellow-bg:        rgba(254,208,0,0.15);
}

15. The 10 Rules You Must Not Break
1. Always use min-width media queries (mobile-first). Never max-width unless retrofitting legacy code.
2. Never hardcode pixel heights on containers that hold dynamic content. Use min-height + clamp() or let content define height.
3. Every overflow: auto container needs min-height: 0 when it's a flex or grid child — otherwise it won't shrink.
4. Tables always need a scroll wrapper. Never let a table force the page to scroll horizontally.
5. Dropdowns use position: absolute, never fixed. Fixed breaks inside CSS transforms, sticky parents, and modals.
6. Chart containers must have explicit height and maintainAspectRatio: false in Chart.js. Otherwise charts render at 0px or wrong ratio.
7. Guard ultra-wide screens with max-width: min(100%, 1600px); margin-inline: auto. Content at 2560px wide is unreadable.
8. Use 100dvh not 100vh on mobile — dvh accounts for the browser chrome (address bar). vh causes layout overflow on iOS Safari.
9. Filters on mobile must be behind a toggle. A toolbar with 4 selects visible on a 375px screen is unusable.
10. Test at exactly 768px and 1024px — these are the most commonly broken sizes because they sit exactly at breakpoint edges where both the mobile and desktop styles partially apply.