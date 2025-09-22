# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CNC Endmill Management System - A comprehensive web application for managing 800 CNC machines' tool replacement and inventory management with real-time monitoring, automated ordering, and detailed analytics.

## Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript with strict mode
- **Styling**: Tailwind CSS with custom design system
- **UI Components**: Shadcn/ui (Radix UI based)
- **State Management**: TanStack Query v5
- **Backend**: Supabase (PostgreSQL, Edge Functions, Realtime, Auth)
- **Validation**: Zod
- **Internationalization**: i18next (Korean/Vietnamese support)

## Common Commands

```bash
# Development
npm run dev                    # Start development server (port 3000)

# Build & Production
npm run build                  # Build for production
npm run start                  # Start production server

# Code Quality
npm run lint                   # Run ESLint
npm run typecheck             # Run TypeScript type checking (if available)

# Admin Tools
npm run create-admin          # Create admin user interactively
npm run create-default-admin  # Create default admin user
```

## Project Architecture

### Directory Structure
```
app/                          # Next.js App Router
├── api/                     # API routes
│   ├── auth/               # Authentication endpoints
│   ├── cam-sheets/         # CAM sheet management
│   ├── dashboard/          # Dashboard data
│   ├── equipment/          # Equipment management
│   ├── inventory/          # Inventory management
│   └── tool-changes/       # Tool change records
├── dashboard/              # Protected dashboard pages
│   ├── cam-sheets/        # CAM sheet viewer
│   ├── equipment/         # Equipment management
│   ├── inventory/         # Inventory management
│   ├── tool-changes/      # Tool change history
│   └── users/             # User management
└── (auth)/                # Authentication pages

lib/                         # Core application logic
├── auth/                   # Authentication & permissions
├── config/                 # Environment configuration
├── hooks/                  # React hooks
├── i18n/                   # Internationalization
├── providers/              # React context providers
├── services/               # External service integrations
├── supabase/              # Supabase client configuration
├── types/                  # TypeScript type definitions
└── utils/                  # Utility functions

components/                  # Reusable React components
├── ui/                    # Base UI components
├── dashboard/             # Dashboard-specific components
└── features/              # Feature-specific components
```

### Key Architectural Patterns

1. **Authentication Flow**:
   - Supabase Auth with email/password
   - Role-based access control (admin, manager, operator)
   - Protected routes using middleware

2. **Data Layer**:
   - Supabase client for database operations
   - React Query for server state management
   - Real-time subscriptions for live updates

3. **Internationalization**:
   - Database-driven translations
   - User preference storage
   - Korean (default) and Vietnamese support

4. **API Design**:
   - RESTful endpoints in `app/api`
   - Consistent error handling
   - Type-safe with TypeScript

## Database Schema

Key tables:
- `equipments` - CNC machine records (models: PA1, PA2, PS, B7, Q7)
- `tool_positions` - Tool positions T1-T24 per machine
- `endmill_types` - Tool specifications and costs
- `tool_changes` - Replacement history with operator tracking
- `inventory` - Stock levels and reorder points
- `cam_sheets` - Tool specification sheets per model
- `users` - User accounts with roles and shift assignments

## Supabase Configuration

The project uses Supabase with the following setup:
- **URL**: Configured via `NEXT_PUBLIC_SUPABASE_URL`
- **Anon Key**: Configured via `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Service Role Key**: For server-side operations
- **Row Level Security**: Enabled on all tables
- **Real-time**: Configured for live updates

## Development Guidelines

1. **Component Development**:
   - Use existing UI components from `components/ui`
   - Follow the established pattern with TypeScript interfaces
   - Implement loading and error states

2. **API Development**:
   - Create routes in `app/api`
   - Use consistent response format
   - Implement proper error handling

3. **State Management**:
   - Use React Query for server state
   - Local state with React hooks
   - Form state with React Hook Form

4. **Styling**:
   - Use Tailwind CSS classes
   - Follow the color palette defined in `tailwind.config.ts`
   - Primary color: #1e3a8a (company blue)
   - Status colors: success (#10b981), warning (#f59e0b), danger (#ef4444)

5. **Testing Approach**:
   - Check for test scripts in package.json
   - Follow existing test patterns if available

## Important Considerations

1. **Multi-language Support**: All user-facing text should support Korean/Vietnamese translations
2. **Mobile Optimization**: The app must work on tablets used in the factory
3. **Real-time Updates**: Dashboard and inventory changes should reflect immediately
4. **QR Code Integration**: Support for QR scanning functionality
5. **Excel Export**: Data export capabilities for reports

## Special Precautions

### 1. Absolutely Avoid
- **Mock Data**: Never use mock or fake data structures
- **Any Type**: Avoid using `any` type in TypeScript
- **Direct DOM Manipulation**: Use React patterns instead
- **console.log in Production**: Remove all console.log statements before committing

### 2. Permissions
- Always check user permissions before API calls
- Use reusable permission components
- Implement a11y (accessibility) support
- Maintain consistent permission checks across all features

### 3. Documentation Priority
1. **Practical Implementation**: Focus on actual code that works
2. **Standard Code Patterns**: Document and follow consistent patterns
3. **Type Safety**: Maintain strict type annotations
4. **Component Structure**: Follow established component patterns for consistency

## Environment Variables Required

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Current Implementation Status

- ✅ Basic dashboard with equipment overview
- ✅ Tool change recording system
- ✅ Inventory tracking
- ✅ CAM sheet management
- ✅ User authentication
- 🚧 QR code scanning
- 🚧 Advanced analytics
- 🚧 Automated reordering