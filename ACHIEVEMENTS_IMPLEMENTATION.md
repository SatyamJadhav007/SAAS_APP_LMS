# Achievements & Referral System Implementation

## Overview

This document describes the implementation of the Achievements and Referral system for the LMS application. The system allows users to earn XP points by completing tasks and unlock a Pro subscription at 100 XP.

## Features Implemented

### 1. Achievements System
- **XP Tracking**: Users earn XP for completing specific tasks
- **Achievement Types**:
  - Companion Created: 10 XP
  - 5 Lessons Completed (Overall): 25 XP
  - 5 Science Lessons Completed: 30 XP
  - 10 Lessons Completed (Overall): 55 XP
- **XP Cap**: Maximum 100 XP (overflow protection)
- **Pro Subscription Reward**: Users receive Pro subscription when reaching 100 XP

### 2. Referral System
- **Code Generation**: Users can generate unique referral codes
- **Code Usage**: Users can use one referral code from a friend
- **XP Reward**: Code creator receives 45 XP when their code is used
- **Validation**: Prevents users from using their own codes

## Database Schema

Three new tables have been created:

### 1. `user_xp` Table
Stores XP points for each user:
- `id`: UUID primary key
- `user_id`: Clerk user ID (unique)
- `xp_points`: Integer (0-100)
- `level`: Integer (default: 1)
- `created_at`, `updated_at`: Timestamps

### 2. `achievements` Table
Tracks completed achievements:
- `id`: UUID primary key
- `user_id`: Clerk user ID
- `achievement_type`: Achievement identifier
- `xp_awarded`: XP points awarded
- `completed_at`: Timestamp
- Unique constraint on (user_id, achievement_type) for one-time achievements

### 3. `referral_codes` Table
Stores referral codes:
- `id`: UUID primary key
- `code`: Unique referral code
- `creator_id`: User who created the code
- `used_by_id`: User who used the code (nullable)
- `xp_awarded`: Boolean flag
- `created_at`, `used_at`: Timestamps
- Unique constraint on `creator_id` (one code per user)

## Setup Instructions

### 1. Database Setup

Run the SQL script to create the tables:

```bash
# Execute the SQL file in your Supabase SQL editor
database_schema_achievements.sql
```

Or manually create the tables using the SQL provided in `database_schema_achievements.sql`.

### 2. File Structure

New files created:
- `lib/actions/achievement.action.ts` - Server actions for achievements and referrals
- `app/achievements/page.tsx` - Achievements page UI
- `components/ReferralComponent.tsx` - Referral code component
- `database_schema_achievements.sql` - Database schema
- `types/index.d.ts` - Updated with new TypeScript types

Modified files:
- `components/NavItems.tsx` - Added Achievements link
- `lib/actions/companion.action.ts` - Added achievement checks
- `app/globals.css` - Added achievement-specific styles

### 3. Navigation

The Achievements page is accessible via:
- Navigation menu: "Achievements" link
- Direct URL: `/achievements`

## Implementation Details

### Achievement Checking

Achievements are automatically checked and awarded when:
1. **Companion Created**: After a user creates a new companion
2. **Session Completed**: After a user completes a lesson session

The `checkAndAwardAchievements()` function:
- Queries user stats (companions, sessions, science sessions)
- Checks if achievement criteria are met
- Awards achievements if not already completed
- Updates user XP

### XP Calculation

- XP is capped at 100 points
- Overflow protection: If XP exceeds 100, it's set to 100
- Pro subscription is granted when user reaches 100 XP (placeholder for Clerk integration)

### Referral Code System

**Code Generation**:
- Format: `REF-{USERID}-{RANDOM}`
- One code per user
- Codes are case-insensitive

**Code Usage**:
- Users can only use one referral code
- Code creator receives 45 XP when code is used
- Validation prevents:
  - Using own code
  - Using already-used codes
  - Using invalid codes

## UI/UX Features

### Achievements Page
- **XP Progress Bar**: Visual representation of progress to 100 XP
- **Achievement Cards**: Display all available achievements with:
  - Completion status (checkmark/circle icon)
  - XP reward amount
  - Completion date (if completed)
  - Visual distinction for completed achievements
- **Stats Section**: Shows user progress metrics
- **Pro Unlock Badge**: Displays when user reaches 100 XP

### Referral Component
- **Code Generation**: Button to generate referral code
- **Code Display**: Shows code with copy button
- **Code Input**: Form to enter and apply referral codes
- **Visual Feedback**: Toast notifications for all actions

### Design Principles Applied
- ✅ Consistent with existing design system (rounded-4xl, border-black)
- ✅ Responsive design (mobile-friendly)
- ✅ Accessible (keyboard navigation, focus states)
- ✅ Clear visual hierarchy
- ✅ Immediate feedback (toasts, loading states)
- ✅ Error handling with user-friendly messages

## Integration Points

### Clerk Subscription Integration

**Note**: The Pro subscription reward at 100 XP currently logs a message. To fully implement:

1. Install Clerk's server SDK:
```bash
npm install @clerk/clerk-sdk-node
```

2. Update `awardXP()` function in `lib/actions/achievement.action.ts`:
```typescript
import { clerkClient } from "@clerk/clerk-sdk-node";

// In awardXP function, when user reaches 100 XP:
if (newXP >= MAX_XP && currentXP.xp_points < MAX_XP) {
  try {
    await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: {
        plan: "pro",
        xpUnlocked: true,
      },
    });
    // Or use Clerk's subscription API to grant pro plan
  } catch (error) {
    console.error("Error granting pro subscription:", error);
  }
}
```

## Testing Checklist

- [ ] Create a companion → Check if "Companion Created" achievement is awarded
- [ ] Complete 5 lessons → Check if "5 Lessons" achievement is awarded
- [ ] Complete 5 science lessons → Check if "Science Enthusiast" achievement is awarded
- [ ] Complete 10 lessons → Check if "10 Lessons" achievement is awarded
- [ ] Generate referral code → Verify code is created and displayed
- [ ] Use referral code → Verify creator receives 45 XP
- [ ] Try to use own code → Verify error message
- [ ] Reach 100 XP → Verify Pro unlock badge appears
- [ ] XP overflow → Verify XP caps at 100

## Future Enhancements

Potential improvements:
1. **Achievement Notifications**: Toast notifications when achievements are unlocked
2. **Achievement Badges**: Visual badges/icons for each achievement
3. **Leaderboard**: Show top users by XP
4. **Achievement History**: Timeline view of achievements
5. **More Achievement Types**: Additional tasks and rewards
6. **XP Levels**: Level system based on XP milestones
7. **Referral Analytics**: Track how many users used your code

## Troubleshooting

### Achievement Not Awarding
- Check if achievement already exists in database
- Verify user stats (companions, sessions count)
- Check server logs for errors

### Referral Code Issues
- Verify code format matches expected pattern
- Check if code already used
- Ensure user_id matches in database

### XP Not Updating
- Check database constraints (XP should be 0-100)
- Verify `user_xp` table has entry for user
- Check server action errors

## Notes

- All achievements are **one-time only** (enforced by unique constraint)
- XP is **capped at 100** (overflow protection)
- Referral codes are **one per user** (enforced by unique constraint)
- Users can only **use one referral code** (enforced by used_by_id check)

