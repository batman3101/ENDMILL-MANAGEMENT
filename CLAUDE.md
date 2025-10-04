# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🌐 Language Policy

**IMPORTANT: All responses must be in Korean (한국어)**

- 수정 과정과 결과에 대한 모든 답변은 **반드시 한국어로** 작성할 것
- 코드 설명, 오류 메시지, 진행 상황 보고 등 모든 커뮤니케이션은 한국어 사용
- 예외: 코드 자체, 변수명, 함수명, 주석은 영어 사용 가능

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
   - Role-based access control: `system_admin`, `admin`, `user` (defined in `lib/auth/permissions.ts`)
   - Permission system via `hasPermission()` function checks resource + action combinations
   - Protected routes using middleware

2. **Data Layer**:
   - Two Supabase clients: browser client (`supabase`) and server client (`createServerClient()`) in `lib/supabase/client.ts`
   - Browser client has fallback hardcoded credentials if env vars missing
   - React Query for server state management with custom hooks in `lib/hooks/`
   - Real-time subscriptions configured with 10 events/second limit

3. **Internationalization**:
   - i18next configuration in `lib/i18n.ts` with Korean (default) and Vietnamese
   - All translations stored in code (not database-driven as previously stated)
   - Translation keys organized by feature: common, navigation, dashboard, equipment, endmill, inventory, etc.

4. **API Design**:
   - RESTful endpoints in `app/api` organized by feature
   - Consistent error handling patterns
   - Type-safe with TypeScript using Zod for validation

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
   - Use existing UI components from `components/ui` (Shadcn/ui based on Radix)
   - Follow the established pattern with TypeScript interfaces
   - Implement loading and error states
   - Use custom hooks from `lib/hooks/` for data fetching (e.g., `useAuth`, `useDashboard`, `useEquipment`, etc.)

2. **API Development**:
   - Create routes in `app/api` following the existing structure
   - Use consistent response format with proper HTTP status codes
   - Implement proper error handling with try-catch blocks
   - Key API routes:
     - `/api/auth/*` - Authentication endpoints
     - `/api/dashboard` - Dashboard data
     - `/api/equipment/*` - Equipment CRUD + bulk upload
     - `/api/endmill/*` - Endmill management + categories + suppliers
     - `/api/inventory/*` - Inventory with inbound/outbound sub-routes
     - `/api/tool-changes/*` - Tool change records with auto-fill
     - `/api/cam-sheets` - CAM sheet management
     - `/api/reports/*` - Monthly, cost, tool-life, performance reports

3. **State Management**:
   - Use TanStack Query v5 for server state with custom hooks
   - Local state with React hooks (useState, useReducer)
   - Real-time updates via `useRealtime` hook for live data subscriptions

4. **Styling**:
   - Use Tailwind CSS classes exclusively
   - Follow the color palette defined in `tailwind.config.ts`:
     - Primary: #1e3a8a (company blue) with shades 50-950
     - Secondary: #64748b (gray) with shades 50-900
     - Status colors: success (#10b981), warning (#f59e0b), danger (#ef4444)
   - Touch-friendly sizing: min-height/width "touch" = 44px for mobile/tablet
   - Use safe area spacing for mobile devices

5. **Translations**:
   - Use `useTranslations` hook from `lib/hooks/useTranslations.ts`
   - All user-facing text must have keys in `lib/i18n.ts`
   - Translation keys follow pattern: `category.key` (e.g., `dashboard.title`, `common.save`)

6. **Permissions**:
   - Always check permissions using `hasPermission(userRole, resource, action)` from `lib/auth/permissions.ts`
   - Use `canAccessPage()` for route-level checks
   - Helper functions: `isAdmin()`, `isSystemAdmin()`, `hasHigherRole()`

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

## Important Utilities and Services

1. **Excel Templates** (`lib/utils/`):
   - `excelTemplate.ts` - General Excel utilities
   - `equipmentExcelTemplate.ts` - Equipment bulk upload template
   - `endmillExcelTemplate.ts` - Endmill bulk upload template

2. **Services** (`lib/services/`):
   - `supabaseService.ts` - Supabase database operations wrapper
   - `googleTranslateService.ts` - Google Translate API integration
   - `textScanService.ts` - OCR/text scanning functionality

3. **Type Definitions** (`lib/types/`):
   - `database.ts` - Supabase database types (auto-generated)
   - `endmill.ts` - Endmill-related types
   - `users.ts` - User and auth types
   - `settings.ts` - Settings configuration types
   - `reports.ts` - Report data types

## Current Implementation Status

- ✅ User authentication and role-based permissions
- ✅ Dashboard with equipment overview
- ✅ Equipment management with bulk Excel upload
- ✅ Endmill management with categories and supplier pricing
- ✅ Tool change recording system with auto-fill
- ✅ Inventory tracking (inbound/outbound)
- ✅ CAM sheet management
- ✅ Reports system (monthly, cost, tool-life, performance)
- ✅ User management
- ✅ Multi-language support (Korean/Vietnamese)
- 🚧 QR code scanning (textScanService exists)
- 🚧 Real-time dashboard updates
- 🚧 Automated reordering notifications