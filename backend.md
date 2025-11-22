# Backend Architecture Documentation

## Overview
This AI-powered Learning Management System (LMS) uses a modern serverless backend architecture built on Next.js with Supabase as the primary database and Clerk for authentication. The application leverages server actions for data operations and integrates with Vapi for voice AI capabilities.

## Tech Stack

### Core Backend Technologies
- **Next.js 15.3.3** - Full-stack React framework with App Router
- **Supabase** - PostgreSQL database with real-time capabilities
- **Clerk** - Authentication and user management
- **Vapi** - Voice AI platform for conversational AI
- **Sentry** - Error monitoring and performance tracking

### Key Dependencies
- `@supabase/supabase-js` - Supabase client library
- `@clerk/nextjs` - Clerk authentication integration
- `@vapi-ai/web` - Voice AI SDK
- `@sentry/nextjs` - Error monitoring
- `zod` - Schema validation

## Database Schema

### Tables Structure

#### 1. `companions` Table
```sql
CREATE TABLE companions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  subject VARCHAR NOT NULL, -- enum: maths, language, science, history, coding, geography, economics, finance, business
  topic VARCHAR NOT NULL,
  voice VARCHAR NOT NULL,
  style VARCHAR NOT NULL,
  duration INTEGER NOT NULL,
  author VARCHAR NOT NULL, -- Clerk user ID
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Fields:**
- `id` - Unique identifier (UUID)
- `name` - Display name of the companion
- `subject` - Subject category (enum from Subject enum)
- `topic` - Specific topic within the subject
- `voice` - Voice configuration for the AI
- `style` - Communication style of the companion
- `duration` - Session duration in minutes
- `author` - User ID who created the companion

#### 2. `session_history` Table
```sql
CREATE TABLE session_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  companion_id UUID REFERENCES companions(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL, -- Clerk user ID
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Fields:**
- `id` - Unique identifier (UUID)
- `companion_id` - Foreign key to companions table
- `user_id` - Clerk user ID who had the session
- `created_at` - Timestamp of the session

#### 3. `bookmarks` Table
```sql
CREATE TABLE bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  companion_id UUID REFERENCES companions(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL, -- Clerk user ID
  isMarked BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Fields:**
- `id` - Unique identifier (UUID)
- `companion_id` - Foreign key to companions table
- `user_id` - Clerk user ID who bookmarked
- `isMarked` - Boolean flag for bookmark status

## Supabase Configuration

### Client Setup
```typescript
// lib/supabase.ts
export const createSupabaseClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      async accessToken() {
        return (await auth()).getToken();
      },
    }
  );
};
```

**Key Features:**
- Integrated with Clerk authentication
- Automatic token refresh
- Server-side client creation
- Environment variable configuration

## Server Actions (Database Operations)

### Companion Management

#### 1. Create Companion
```typescript
export const createCompanion = async (formData: CreateCompanion) => {
  const { userId: author } = await auth();
  const supabase = createSupabaseClient();
  
  const { data, error } = await supabase
    .from("companions")
    .insert({ ...formData, author })
    .select();
    
  if (error || !data) {
    throw new Error(error?.message || "Failed to create a companion");
  }
  return data[0];
};
```

#### 2. Get All Companions (with filtering)
```typescript
export const getAllCompanions = async ({
  limit = 10,
  page = 1,
  subject,
  topic,
}: GetAllCompanions) => {
  const supabase = createSupabaseClient();
  let query = supabase.from("companions").select();
  
  // Apply filters
  if (subject && topic) {
    query = query
      .ilike("subject", `%${subject}%`)
      .or(`topic.ilike.%${topic}%,name.ilike.%${topic}%`);
  } else if (subject) {
    query = query.ilike("subject", `%${subject}%`);
  } else if (topic) {
    query = query.or(`topic.ilike.%${topic}%,name.ilike.%${topic}%`);
  }
  
  // Pagination
  query = query.range((page - 1) * limit, page * limit - 1);
  
  const { data: companions, error } = await query;
  if (error) throw new Error(error.message);
  return companions;
};
```

#### 3. Get Single Companion
```typescript
export const getCompanion = async (id: string) => {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("companions")
    .select()
    .eq("id", id);
    
  if (error) console.log(error);
  return data && data.length > 0 ? data[0] : null;
};
```

### Session Management

#### 1. Add Session to History
```typescript
export const addToSessionHistory = async (companionId: string) => {
  const { userId } = await auth();
  const supabase = createSupabaseClient();
  
  const { data, error } = await supabase
    .from("session_history")
    .insert({ companion_id: companionId, user_id: userId });
    
  if (error) throw new Error(error.message);
  return data;
};
```

#### 2. Get Recent Sessions (All Users)
```typescript
export const getRecentSessions = async (limit = 10) => {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("session_history")
    .select(`companions:companion_id (*)`)
    .order("created_at", { ascending: false })
    .limit(limit);
    
  if (error) throw new Error(error.message);
  return data.map(({ companions }) => companions);
};
```

#### 3. Get User Sessions
```typescript
export const getUserSessions = async (userId: string, limit = 10) => {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("session_history")
    .select(`companions:companion_id (*)`)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
    
  if (error) throw new Error(error.message);
  return data.map(({ companions }) => companions);
};
```

### Bookmark Management

#### 1. Add Bookmark
```typescript
export const addBookmark = async (companionId: string, path: string) => {
  const { userId } = await auth();
  if (!userId) return;
  
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("bookmarks")
    .insert({ companion_id: companionId, user_id: userId, isMarked: true });
    
  if (error) throw new Error(error.message);
  revalidatePath(path);
  return data;
};
```

#### 2. Remove Bookmark
```typescript
export const removeBookmark = async (companionId: string, path: string) => {
  const { userId } = await auth();
  if (!userId) return;
  
  const supabase = createSupabaseClient();
  const { error } = await supabase
    .from("bookmarks")
    .delete()
    .eq("companion_id", companionId)
    .eq("user_id", userId);
    
  if (error) throw new Error(error.message);
  revalidatePath(path);
  return false;
};
```

#### 3. Get Bookmarked Companions
```typescript
export const getBookmarkedCompanions = async (userId: string) => {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("bookmarks")
    .select(`companions:companion_id (*)`)
    .eq("user_id", userId);
    
  if (error) throw new Error(error.message);
  return data.map(({ companions }) => companions);
};
```

### User Management

#### 1. Get User Companions
```typescript
export const getUserCompanions = async (userId: string) => {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("companions")
    .select()
    .eq("author", userId);
    
  if (error) throw new Error(error.message);
  return data;
};
```

## Subscription & Permission System

### Companion Creation Permissions
```typescript
export const newCompanionPermissions = async () => {
  const { userId, has } = await auth();
  const supabase = createSupabaseClient();
  let limit = 0;
  
  if (has({ plan: "pro" })) {
    return true; // Unlimited for pro users
  } else if (has({ feature: "3_companion_limit" })) {
    limit = 3;
  } else if (has({ feature: "10_companion_limit" })) {
    limit = 10;
  }
  
  const { data, error } = await supabase
    .from("companions")
    .select("id", { count: "exact" })
    .eq("author", userId);
    
  if (error) throw new Error(error.message);
  const companionCnt = data?.length;
  
  return companionCnt < limit;
};
```

### Conversation Permissions
```typescript
export const newConversationPermissions = async () => {
  const { userId, has } = await auth();
  
  if (has({ plan: "pro" }) || has({ plan: "core" })) {
    return true; // Unlimited for pro/core users
  }
  
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("session_history")
    .select("id", { count: "exact" })
    .eq("user_id", userId);
    
  if (error) throw new Error(error.message);
  const convCnt = data?.length;
  
  return convCnt < 10; // Free users limited to 10 conversations
};
```

## API Routes

### Sentry Example API
```typescript
// app/api/sentry-example-api/route.ts
export const dynamic = "force-dynamic";

class SentryExampleAPIError extends Error {
  constructor(message: string | undefined) {
    super(message);
    this.name = "SentryExampleAPIError";
  }
}

export function GET() {
  throw new SentryExampleAPIError("This error is raised on the backend called by the example page.");
  return NextResponse.json({ data: "Testing Sentry Error..." });
}
```

**Purpose:** Demonstrates error monitoring with Sentry integration.

## Middleware Configuration

```typescript
// middleware.ts
import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
```

**Features:**
- Clerk authentication middleware
- Protects all routes except static files
- Handles API route authentication

## Frontend-Backend Interactions

### 1. Server-Side Data Fetching
Pages use server components to fetch data directly from the database:

```typescript
// app/page.tsx
const Page = async () => {
  const companions = await getAllCompanions({ limit: 3 });
  const recentSessionCompanions = await getRecentSessions(10);
  const user = await currentUser();
  
  if (!user) redirect("/sign-in");
  
  return (
    <main>
      {/* Render components with fetched data */}
    </main>
  );
};
```

### 2. Form Submissions
Client components use server actions for form submissions:

```typescript
// components/CompanionForm.tsx
const onSubmit = async (values: CreateCompanion) => {
  setIsSubmitting(true);
  const companion = await createCompanion(values);
  if (companion) {
    redirect(`/companions/${companion.id}`);
  }
};
```

### 3. Real-time Updates
The application uses `revalidatePath` for cache invalidation:

```typescript
// After bookmark operations
revalidatePath(path);
```

### 4. Voice AI Integration
```typescript
// lib/vapi.sdk.ts
import Vapi from "@vapi-ai/web";

export const vapi = new Vapi(process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN!);
```

**Usage in Components:**
- Real-time voice conversations
- Session management
- Message handling
- Call status tracking

## Environment Variables

### Required Environment Variables
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# Vapi
NEXT_PUBLIC_VAPI_WEB_TOKEN=your_vapi_web_token

# Sentry
SENTRY_DSN=your_sentry_dsn
```

## Security Features

### 1. Authentication
- Clerk-based authentication for all protected routes
- Automatic token refresh and validation
- User session management

### 2. Authorization
- User-specific data access (companions, sessions, bookmarks)
- Subscription-based feature access
- Permission checks before operations

### 3. Data Validation
- Zod schema validation for form inputs
- TypeScript type safety throughout the application
- Server-side validation for all database operations

### 4. Error Handling
- Comprehensive error handling in server actions
- Sentry integration for error monitoring
- Graceful fallbacks for failed operations

## Performance Optimizations

### 1. Database Queries
- Efficient filtering and pagination with proper indexing
- Optimized column selection (avoiding SELECT *)
- Error handling and logging for better debugging
- Query result caching and stale-while-revalidate patterns

### 2. Client-Side Caching & State Management
- **React Query/TanStack Query**: Intelligent caching with 1-5 minute stale times
- **Zustand Store**: Global state management with persistence
- **Optimistic Updates**: Immediate UI feedback for better UX
- **Prefetching**: Preload likely next pages for faster navigation

### 3. Component Optimizations
- **React.memo()**: Prevent unnecessary re-renders
- **useCallback()**: Memoize event handlers
- **Suspense Boundaries**: Show loading states during data fetching
- **Lazy Loading**: Code splitting for better initial load times

### 4. Navigation Optimizations
- **Link Prefetching**: Preload pages on hover/focus
- **Route-based Code Splitting**: Load components only when needed
- **Loading States**: Skeleton screens for better perceived performance

### 5. Real-time Features
- Supabase real-time subscriptions (configured but not actively used)
- Efficient session management with optimistic updates
- Optimized voice AI integration with proper cleanup

## Monitoring & Observability

### 1. Error Tracking
- Sentry integration for error monitoring
- Performance tracking
- User session monitoring

### 2. Logging
- Console logging for development
- Error logging in production
- Database operation logging

## Deployment Considerations

### 1. Serverless Architecture
- Next.js App Router with server components
- Server actions for database operations
- Edge-compatible middleware

### 2. Database
- Supabase hosted PostgreSQL
- Connection pooling
- Automatic backups and scaling

### 3. Authentication
- Clerk hosted authentication service
- JWT token management
- Social login integration

This backend architecture provides a scalable, secure, and maintainable foundation for the AI-powered LMS application, with clear separation of concerns and modern development practices.
