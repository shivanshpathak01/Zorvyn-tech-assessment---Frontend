# Finance Dashboard UI (React + Tailwind)

This project is an assessment submission for a frontend intern task.
It demonstrates a clean, interactive finance dashboard using React state and Tailwind CSS styling.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Run development server:

```bash
npm run dev
```

3. Build for production:

```bash
npm run build
```

## What This Submission Includes

### 1) Dashboard Overview
- Summary cards for Total Balance, Income, and Expenses
- Time-based visualization: monthly balance trend chart (SVG)
- Categorical visualization: spending breakdown bars by category

### 2) Transactions Section
- Transaction table with date, description, category, type, and amount
- Search across description/category/type
- Filter by transaction type and category
- Sorting by date and amount
- Empty-state handling when no rows match filters

### 3) Basic Role-Based UI (Frontend Simulation)
- Role switcher: Viewer / Admin
- Viewer: read-only access
- Admin: can add transactions and edit existing ones

### 4) Insights Section
- Highest spending category
- Monthly expense comparison (latest vs previous month)
- Average expense per transaction

### 5) State Management
- Managed with React hooks (`useState`, `useMemo`, `useEffect`)
- State includes:
  - transactions
  - filters/search/sort
  - selected role
  - add/edit form state

### 6) UI/UX Expectations
- Responsive layout across mobile and desktop breakpoints
- Clean visual hierarchy and readable typography
- Graceful handling of no-data/empty-filter scenarios

## Optional Enhancements Included
- Dark mode with persisted theme selection
- Local storage persistence for transactions
- Mock API integration with simulated async loading and saves
- Animations and transitions for cards, loading states, and interactions
- Export functionality for CSV and JSON
- Advanced filtering and grouping by time, category, and month

## Technical Notes
- Framework: React (Vite)
- Styling: Tailwind CSS via `@tailwindcss/vite`
- Data: static/mock data in `src/data/mockData.js`

## Requirement Mapping Summary
- Design + creativity: custom visual style, gradient atmosphere, chart cards
- Responsiveness: flexible grid and table behavior across viewport sizes
- Functionality: all core assignment interactions implemented
- UX: role cues, filter controls, clear labels, state feedback
- Code quality: modular logic via memoized derived data and reusable helpers
- Documentation: this README explains setup + feature coverage
- Optional enhancements: included and documented above

