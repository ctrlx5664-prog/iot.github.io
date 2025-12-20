# IoT Device Management Dashboard - Design Guidelines

## Design Approach: System-Based (Utility Dashboard)
**Selected Framework:** Modern dashboard design inspired by Linear, Vercel Dashboard, and Material Design
**Justification:** This is a utility-focused control interface requiring efficiency, clarity, and real-time data visualization over aesthetic flourish.

## Core Design Principles
1. **Information Hierarchy:** Device status and controls take precedence over decorative elements
2. **Efficiency First:** Minimize clicks between viewing status and taking action
3. **Real-time Feedback:** Clear visual indicators for device states and connection status
4. **Spatial Organization:** Group devices by company/location for quick navigation

## Typography System
- **Primary Font:** Inter or SF Pro (via Google Fonts CDN)
- **Hierarchy:**
  - Page titles: text-2xl font-semibold
  - Section headers: text-lg font-medium
  - Device names: text-base font-medium
  - Labels/metadata: text-sm text-gray-600
  - Status indicators: text-xs font-medium uppercase tracking-wide

## Layout System
**Spacing Units:** Tailwind units of 2, 4, 6, and 8 (p-2, m-4, gap-6, h-8)
**Container Structure:**
- Sidebar navigation: Fixed width 64 (w-64)
- Main content area: flex-1 with max-w-7xl mx-auto px-6
- Card padding: p-6
- Section spacing: space-y-6

**Layout Pattern:**
```
[Sidebar Navigation] | [Header Bar] 
                     | [Content Grid]
```

## Component Library

**Navigation Sidebar:**
- Company/location tree structure
- Collapsible sections
- Active state indicators
- Device count badges

**Status Cards:**
- Grid layout (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)
- Device thumbnail/icon
- Status badge (online/offline with pulse animation for online)
- Quick action buttons

**Light Controls:**
- Toggle switches (large, thumb-style)
- Brightness slider with percentage display
- RGB color picker (compact wheel or swatches)
- Preset color buttons for quick selection

**TV Display Controls:**
- Video thumbnail preview
- Upload zone with drag-and-drop
- Playlist management (sortable list)
- Loop indicator toggle

**Header Bar:**
- Search/filter input (w-64)
- Global actions (refresh, settings)
- User profile dropdown

## Real-time Indicators
- Connection status: Colored dot badges (green=online, red=offline, yellow=warning)
- Subtle pulse animation on status dots
- Last updated timestamp (text-xs text-gray-500)
- Loading spinners for state changes

## Interactive States
- Hover: Subtle elevation on cards (shadow-md)
- Active controls: Immediate visual feedback
- Disabled states: Reduced opacity (opacity-50)
- Error states: Red border with error message

## Data Visualization
- Device health: Simple progress bars
- Usage statistics: Minimal line charts (Chart.js or Recharts)
- Company overview: Count badges and status summaries

## Icons
**Library:** Heroicons (via CDN)
**Usage:**
- Device types (light bulb, TV screen)
- Actions (power, settings, upload)
- Navigation (chevrons, home, grid)
- Status (check, warning, x-circle)

## No Images Needed
This is a dashboard application - no hero images or marketing imagery required. Device icons and status indicators are sufficient.

## Accessibility Notes
- All controls keyboard accessible
- Clear focus states (ring-2 ring-blue-500)
- ARIA labels on icon-only buttons
- Color-blind safe status indicators (use icons + color)

## Animation Guidelines
**Use Sparingly:**
- Pulse effect on online status indicators only
- Smooth transitions on toggle switches (transition-all duration-200)
- No scroll animations or decorative effects