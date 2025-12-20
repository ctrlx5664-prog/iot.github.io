# IoT Device Management Dashboard

## Overview

This is an IoT Device Management Dashboard application for controlling and monitoring smart lights and TV displays across multiple company locations. The system provides real-time device control with a modern, efficiency-focused interface built using React, Express, and WebSockets. The application follows a multi-tenant architecture where companies contain locations, and locations contain devices (lights and TVs).

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- React 18 with TypeScript for type-safe component development
- Vite as the build tool and development server for fast HMR (Hot Module Replacement)
- Wouter for lightweight client-side routing instead of React Router

**UI Component Strategy**
- Shadcn/ui component library (New York variant) with Radix UI primitives for accessibility
- Tailwind CSS for utility-first styling with custom design tokens
- Design system inspired by Linear and Vercel Dashboard for a clean, modern aesthetic
- Custom color system using HSL values with CSS variables for theming support
- Light/dark theme support through a custom ThemeProvider

**State Management & Data Fetching**
- TanStack Query (React Query) for server state management, caching, and automatic refetching
- Custom query client configured with infinite stale time to prevent unnecessary refetches
- Real-time updates via WebSocket connection for device state synchronization

**Application Structure**
- Sidebar navigation pattern with collapsible company/location hierarchy
- Main content area with responsive grid layouts for device cards
- Page-based routing: Dashboard, Companies, Location Detail, Videos, and 404

### Backend Architecture

**Server Framework**
- Express.js with TypeScript for the REST API
- HTTP server creation using Node's built-in `http` module to support WebSocket upgrades

**API Design Pattern**
- RESTful endpoints following resource-based conventions
- Consistent error handling with appropriate HTTP status codes
- Request/response logging middleware for debugging
- JSON request body parsing with raw body preservation for webhook support

**Data Storage Strategy**
- Drizzle ORM configured for PostgreSQL via `@neondatabase/serverless`
- Schema-first approach with TypeScript types generated from Zod schemas
- In-memory storage interface (`IStorage`) allowing for easy database implementation swap
- Shared schema definitions between client and server using a monorepo structure

**Real-time Communication**
- WebSocket server (ws library) for bidirectional real-time updates
- Device update messages broadcast to all connected clients
- Automatic reconnection logic on the client side with exponential backoff

**Project Structure Philosophy**
- Monorepo with shared types and schemas between client/server
- Path aliases (`@/`, `@shared/`) for clean imports
- Separation of concerns: routes, storage, schema definitions

### External Dependencies

**Database**
- PostgreSQL via Neon serverless driver (`@neondatabase/serverless`)
- Drizzle ORM for type-safe database queries and migrations
- Connection via `DATABASE_URL` environment variable

**UI Component Libraries**
- Radix UI primitives (18+ components) for accessible, unstyled UI components
- Lucide React for consistent iconography
- Embla Carousel for carousel/slider functionality
- CMDK for command palette interfaces

**Form Handling & Validation**
- React Hook Form with Hookform Resolvers for form state management
- Zod for runtime type validation and schema definition
- Drizzle-Zod for generating Zod schemas from Drizzle table definitions

**Styling & Theming**
- Tailwind CSS with PostCSS for processing
- Class Variance Authority (CVA) for type-safe component variants
- clsx and tailwind-merge for conditional class name composition
- Custom CSS variables system for color tokens and spacing

**Development Tools**
- TSX for running TypeScript in development
- ESBuild for production server bundling
- Drizzle Kit for database schema management and migrations
- Replit-specific plugins for development banner and error overlay

**Third-Party Services**
- Google Fonts CDN for typography (Inter, DM Sans, Fira Code, Geist Mono, Architects Daughter)
- WebSocket protocol for real-time device state synchronization

**Key Architectural Decisions**

1. **Shared Schema Pattern**: Using a shared `/shared` directory for type definitions ensures type consistency between frontend and backend, reducing bugs from type mismatches.

2. **WebSocket for Real-time Updates**: Instead of polling, WebSockets provide instant updates when device states change, crucial for IoT control interfaces where immediate feedback is expected.

3. **Storage Interface Abstraction**: The `IStorage` interface allows swapping storage implementations without changing business logic, making it easy to transition from in-memory to database storage.

4. **Monorepo Structure**: Client and server code live together with shared types, simplifying development and deployment while maintaining code reuse.

5. **Zod-First Validation**: Runtime validation with Zod ensures data integrity at API boundaries and provides automatic TypeScript type inference.