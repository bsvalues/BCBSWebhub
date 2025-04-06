# Benton County Styling Guidelines

## Overview

This document outlines the styling guidelines for the Benton County Assessor's Office applications, including the County Audit Hub and LevyMaster systems. These components provide a consistent, spreadsheet-inspired user interface that is familiar and comfortable for county assessors.

## Components

The following reusable components are available:

### 1. Spreadsheet Form Fields

Structured form inputs that mimic the appearance of a spreadsheet.

```jsx
<SpreadsheetFormField label="Field Name">
  <Input type="text" className="spreadsheet-number-input" />
</SpreadsheetFormField>
```

Key classes:
- `.spreadsheet-section` - Container for a group of related fields
- `.spreadsheet-field` - Container for label and input
- `.spreadsheet-label` - Field label (left column)
- `.spreadsheet-input` - Field input container (right column)
- `.spreadsheet-number-input` - Monospace right-aligned input for numbers
- `.spreadsheet-calculated-input` - Styled for calculated/readonly values

### 2. Grid Table

Data grid component that displays tabular data in a spreadsheet-like format.

```jsx
<GridTable 
  columns={[
    { key: 'id', header: 'ID', width: '20%' },
    { key: 'value', header: 'Value', width: '30%', numeric: true },
  ]}
  data={dataArray}
  onRowClick={handleRowClick}
/>
```

Key classes:
- `.grid-table-container` - Outer container with borders and scrolling
- `.grid-table` - Table structure
- `.grid-header` - Header row
- `.grid-body` - Container for data rows
- `.grid-row` - Individual data row
- `.grid-cell` - Individual cell (add `text-right` for numeric)

### 3. Status Timeline

Visual indicator for multi-step processes showing completed, current, and pending steps.

```jsx
<StatusTimeline 
  steps={[
    { label: 'Step 1', status: 'completed' },
    { label: 'Step 2', status: 'current' },
    { label: 'Step 3', status: 'pending' }
  ]} 
/>
```

Key classes:
- `.status-timeline` - Container for the entire timeline
- `.status-step` - Individual step container
- `.status-step-marker` - The dot/circle for each step
- `.status-step-connector` - The line connecting steps
- `.status-step-label` - Text label for the step
- Status modifiers: `.completed`, `.current`, `.pending`

### 4. Stat Cards

Compact metrics display with optional trend indicators.

```jsx
<StatCard 
  title="Metric Name" 
  value="42%" 
  trend={{ value: "Trend Label", positive: true }}
/>
```

Key classes:
- `.stat-card` - Card container
- `.stat-card-title` - Metric name/title
- `.stat-card-value` - The primary metric value
- `.stat-card-trend` - Container for trend indicator and text

## Integration

### React Components

React components implementing these designs are provided in `BentonCountyExample.tsx`. They include:

1. `BentonCountyHeader` - County branding header
2. `SpreadsheetFormField` - Label + input field combo
3. `GridTable` - Spreadsheet-style data grid
4. `StatCard` - Metrics display card
5. `StatusTimeline` - Process status visualization
6. `LevyMasterForm` - Complete form example

### CSS Stylesheets

The file `benton-county-styles.css` contains all the necessary styles. Import it at the beginning of your CSS:

```css
@import './benton-county-styles.css';
```

## Theme Colors

The Benton County applications use a color palette optimized for readability and reduced eye strain:

- Primary Blue: `#3b82f6` - Active elements, current status
- Green: `#10b981` - Success, completed status, positive trends
- Red: `#ef4444` - Error, negative trends
- Neutral: `#6b7280` - Text, labels
- Border: `#e2e8f0` - Dividers, borders
- Background Blue: `#27374D` - Header background

## Usage Examples

See the following files for implementation examples:

- `example-usage.html` - HTML/CSS implementation examples
- `style-demo.tsx` - React implementation example
- `BentonCountyExample.tsx` - Complete component implementations

## Responsive Design

All components are designed to be responsive. On smaller screens:

- Spreadsheet fields stack vertically instead of in columns
- Grid tables become scrollable horizontally
- Stat cards wrap to maintain readability

## Accessibility

The components follow accessibility best practices:

- Sufficient color contrast for text
- Proper labeling of form elements
- Keyboard navigability
- Appropriate text sizes

---

## Contact

For questions about these styling guidelines, please contact the Benton County Assessor's Office IT team.
