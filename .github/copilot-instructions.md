# Copilot Instructions - Currency Exchange Insurance Request System

## Architecture Overview

This React application manages currency exchange insurance requests for Epysa. Key components:

- **Frontend**: React + TypeScript + shadcn/ui + Tailwind CSS
- **Backend Integration**: Custom `epysa-dataproc` package for database procedures
- **State**: TanStack Query for server state, React Context for auth/UI state
- **Auth**: Epysa-specific authentication via `EpysaApi.auth` (not standard OAuth)
- **Database**: SQL Server with stored procedures, schema under `frwrd.*`

## Key Patterns & Conventions

### File Organization
- `/src/types/index.ts` - Central type definitions (enums, interfaces)
- `/src/integrations/epy/` - Epysa API integration layer
- `/src/components/forms/` - Reusable form components with validation
- `/src/utils/coverage.ts` - Complex business logic for coverage calculations
- `/src/hooks/` - Custom hooks for data fetching and auth

### Authentication & Authorization
- Users have roles: `VENDEDOR`, `COORDINADOR`, `ADMIN` (defined in UserRole enum)
- Auth context via `useAuth()` hook, provides `userProfile.role`
- Role-based UI visibility controlled by `ViewRoleContext` (allows admins to view as different roles)
- Protected routes wrap components in `<ProtectedRoute>`

### Data Layer Patterns
```tsx
// Always use exec() wrapper for stored procedure calls
import { exec } from '@/integrations/epy/EpysaApi';
const result = await exec('procedure_name', { param1: value1 });

// TanStack Query for server state
const { data, isLoading } = useQuery({
  queryKey: ['requests', userId],
  queryFn: () => exec('sp_get_user_requests', { user_id: userId })
});
```

### Form Patterns
- React Hook Form + Zod validation schemas in `/src/schemas/`
- Chilean number formatting: `1.234,56` (periods for thousands, comma for decimal)
- RUT validation with format `12.345.678-9`
- Payment arrays stored as JSON strings in database
- Always validate positive numbers for USD amounts

### Coverage Calculations
The `calculateCoverage()` function handles complex business logic:
- Uses `tcReferencial` (reference rate) and `tcCliente` (client rate)
- Filters payments by `COVERAGE_PAYMENT_TYPES` only
- Rounds covered exposure down to nearest thousand
- Returns both USD and CLP values for display

### UI Components
- shadcn/ui components in `/src/components/ui/`
- Custom status badges: `<StatusBadge status={request.estado} />`
- Responsive layout with `<DashboardLayout>` wrapper
- Toast notifications via `useToast()` hook

## Development Workflow

```bash
npm i                    # Install dependencies
npm run dev              # Start dev server (port 8080)
npm run build           # Production build
npm run lint            # ESLint check
```

### Environment Variables Required
- `VITE_DATA_URL` - Epysa data processor endpoint
- `VITE_DB_NAME` - Database name for epysa-dataproc
- `VITE_LOGIN_PAGE` - Login page URL
- `VITE_PROXY_TARGET` - Backend proxy target
- `VITE_BASE` - Base path for routing

### Database Integration
- Stored procedures prefixed with `sp_` in `frwrd` schema
- Use `StringArrayType` table type for array parameters
- JSON columns for `numeros_internos` and `payments`
- UUIDs for primary keys (`UNIQUEIDENTIFIER`)

## Common Tasks

- **Add new request status**: Update `RequestStatus` enum and `STATUS_LABELS`
- **New payment type**: Update `PaymentType` enum, `PAYMENT_TYPE_LABELS`, and coverage logic
- **Form validation**: Add schema to `/src/schemas/`, import in form component
- **New page**: Add route to `App.tsx`, wrap in `<ProtectedRoute>` and `<DashboardLayout>`
- **Database changes**: Update SQL in `/mssql/final.sql`, ensure procedure compatibility

## Important Notes

- Exchange rates use 6 decimal precision (`NUMERIC(18,6)`)
- All monetary amounts in forms use Chilean formatting
- Role-based features: Use `currentViewRole` from `ViewRoleContext`
- Error handling: Epysa procedures return errors in `Error_msg` field
- File paths: Always use absolute imports with `@/` alias