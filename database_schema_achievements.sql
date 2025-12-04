-- Database Schema for Achievements and Referral System
--(NOTE:This migration script will only work if you have the companion,session_history and bookmarks table.Also,Use the previous RLS policiy for the new tables)

-- 1. User XP Table - Stores XP points for each user
CREATE TABLE IF NOT EXISTS user_xp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL UNIQUE, -- Clerk user ID
  xp_points INTEGER DEFAULT 0 CHECK (xp_points >= 0 AND xp_points <= 100),
  level INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_xp_user_id ON user_xp(user_id);

-- 2. Achievements Table - Tracks completed achievements
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL, -- Clerk user ID
  achievement_type VARCHAR NOT NULL, -- 'companion_created', 'lessons_5', 'science_5', 'lessons_10'
  xp_awarded INTEGER NOT NULL,
  completed_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, achievement_type) -- Ensure one-time achievements
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_type ON achievements(achievement_type);

-- 3. Referral Codes Table - Stores referral codes and usage
CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR NOT NULL UNIQUE, -- Unique referral code
  creator_id VARCHAR NOT NULL, -- Clerk user ID who created the code
  used_by_id VARCHAR, -- Clerk user ID who used the code (NULL if unused)
  xp_awarded BOOLEAN DEFAULT false, -- Whether XP was awarded to creator
  created_at TIMESTAMP DEFAULT NOW(),
  used_at TIMESTAMP,
  UNIQUE(creator_id) -- One code per user
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referral_codes_creator ON referral_codes(creator_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_used_by ON referral_codes(used_by_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for user_xp table
CREATE TRIGGER update_user_xp_updated_at BEFORE UPDATE ON user_xp
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

