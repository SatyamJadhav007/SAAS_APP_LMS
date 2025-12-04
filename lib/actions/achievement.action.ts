"use server";

import { auth } from "@clerk/nextjs/server";
import { createSupabaseClient } from "../supabase";
import { revalidatePath } from "next/cache";

import { ACHIEVEMENT_TYPES, ACHIEVEMENT_XP, MAX_XP } from "@/constants/achievements";

// Get or create user XP record
export const getUserXP = async (userId: string) => {
  const supabase = createSupabaseClient();
  
  // Try to get existing XP record
  const { data, error } = await supabase
    .from("user_xp")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error && error.code === "PGRST116") {
    // No record found, create one
    const { data: newData, error: createError } = await supabase
      .from("user_xp")
      .insert({ user_id: userId, xp_points: 0, level: 1 })
      .select()
      .single();

    if (createError) throw new Error(createError.message);
    return newData;
  }

  if (error) throw new Error(error.message);
  return data;
};

// Award XP to user (with overflow protection)
export const awardXP = async (userId: string, xp: number) => {
  const supabase = createSupabaseClient();
  
  // Get current XP
  const currentXP = await getUserXP(userId);
  // Cap XP at MAX_XP
  const newXP = Math.min(currentXP.xp_points + xp, MAX_XP);

  // Update XP
  const { data, error } = await supabase
    .from("user_xp")
    .update({ xp_points: newXP })
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Check if user reached 100 XP (used by permission checks to treat them as Pro)
  if (newXP >= MAX_XP && currentXP.xp_points < MAX_XP) {
    console.log(`User ${userId} reached 100 XP - XP-based Pro unlocked`);
  }

  return data;
};

// Check if achievement is already completed
export const hasAchievement = async (
  userId: string,
  achievementType: string
) => {
  const supabase = createSupabaseClient();
  
  const { data, error } = await supabase
    .from("achievements")
    .select("id")
    .eq("user_id", userId)
    .eq("achievement_type", achievementType)
    .single();

  if (error && error.code === "PGRST116") return false;
  if (error) throw new Error(error.message);
  return !!data;
};

// Award achievement and XP
export const awardAchievement = async (
  userId: string,
  achievementType: string,
  xp: number
) => {
  const supabase = createSupabaseClient();

  // Check if already completed
  const alreadyCompleted = await hasAchievement(userId, achievementType);
  if (alreadyCompleted) {
    return { alreadyCompleted: true };
  }

  // Award achievement and XP in a transaction-like manner
  const { error: achievementError } = await supabase
    .from("achievements")
    .insert({
      user_id: userId,
      achievement_type: achievementType,
      xp_awarded: xp,
    });

  if (achievementError) throw new Error(achievementError.message);

  // Award XP
  await awardXP(userId, xp);

  revalidatePath("/achievements");
  return { success: true };
};

// Get all user achievements
export const getUserAchievements = async (userId: string) => {
  const supabase = createSupabaseClient();
  
  const { data, error } = await supabase
    .from("achievements")
    .select("*")
    .eq("user_id", userId)
    .order("completed_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
};

// Check and award achievements based on user stats
export const checkAndAwardAchievements = async (userId: string) => {
  const supabase = createSupabaseClient();
  
  // Get user stats
  const [companionsResult, sessionsResult] = await Promise.all([
    // Count companions created
    supabase
      .from("companions")
      .select("id", { count: "exact", head: true })
      .eq("author", userId),
    // Count all sessions
    supabase
      .from("session_history")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
  ]);

  const companionCount = companionsResult.count || 0;
  const totalSessions = sessionsResult.count || 0;

  // Get science sessions count
  const { data: scienceData } = await supabase
    .from("session_history")
    .select("companions:companion_id(subject)")
    .eq("user_id", userId);

  const scienceSessionsCount =
    scienceData?.filter(
      (session: any) => session.companions?.subject === "science"
    ).length || 0;

  const achievementsToCheck = [];

  // Check companion created
  if (companionCount >= 1) {
    achievementsToCheck.push({
      type: ACHIEVEMENT_TYPES.COMPANION_CREATED,
      xp: ACHIEVEMENT_XP[ACHIEVEMENT_TYPES.COMPANION_CREATED],
    });
  }

  // Check 5 lessons
  if (totalSessions >= 5) {
    achievementsToCheck.push({
      type: ACHIEVEMENT_TYPES.LESSONS_5,
      xp: ACHIEVEMENT_XP[ACHIEVEMENT_TYPES.LESSONS_5],
    });
  }

  // Check 10 lessons
  if (totalSessions >= 10) {
    achievementsToCheck.push({
      type: ACHIEVEMENT_TYPES.LESSONS_10,
      xp: ACHIEVEMENT_XP[ACHIEVEMENT_TYPES.LESSONS_10],
    });
  }

  // Check 5 science lessons
  if (scienceSessionsCount >= 5) {
    achievementsToCheck.push({
      type: ACHIEVEMENT_TYPES.SCIENCE_5,
      xp: ACHIEVEMENT_XP[ACHIEVEMENT_TYPES.SCIENCE_5],
    });
  }

  // Award achievements
  const results = [];
  for (const achievement of achievementsToCheck) {
    const result = await awardAchievement(userId, achievement.type, achievement.xp);
    results.push({ ...achievement, ...result });
  }

  return results;
};

// Generate referral code
export const generateReferralCode = async () => {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const supabase = createSupabaseClient();

  // Check if user already has a code
  const { data: existingCode } = await supabase
    .from("referral_codes")
    .select("code")
    .eq("creator_id", userId)
    .single();

  if (existingCode) {
    return { code: existingCode.code, alreadyExists: true };
  }

  // Generate unique code
  const code = `REF-${userId.slice(0, 8).toUpperCase()}-${Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase()}`;

  // Insert code
  const { data, error } = await supabase
    .from("referral_codes")
    .insert({
      code,
      creator_id: userId,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/achievements");
  return { code: data.code, alreadyExists: false };
};

// Use referral code
export const useReferralCode = async (code: string) => {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const supabase = createSupabaseClient();

  // Get referral code
  const { data: referralCode, error: fetchError } = await supabase
    .from("referral_codes")
    .select("*")
    .eq("code", code.toUpperCase())
    .single();

  if (fetchError || !referralCode) {
    throw new Error("Invalid referral code");
  }

  // Check if code is already used
  if (referralCode.used_by_id) {
    throw new Error("This referral code has already been used");
  }

  // Check if user is trying to use their own code
  if (referralCode.creator_id === userId) {
    throw new Error("You cannot use your own referral code");
  }

  // Mark code as used
  const { error: updateError } = await supabase
    .from("referral_codes")
    .update({
      used_by_id: userId,
      used_at: new Date().toISOString(),
    })
    .eq("id", referralCode.id);

  if (updateError) throw new Error(updateError.message);

  // Award XP to creator
  if (!referralCode.xp_awarded) {
    await awardXP(referralCode.creator_id, 45);
    await supabase
      .from("referral_codes")
      .update({ xp_awarded: true })
      .eq("id", referralCode.id);
  }

  revalidatePath("/achievements");
  return { success: true };
};

// Get user's referral code
export const getUserReferralCode = async () => {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const supabase = createSupabaseClient();

  const { data, error } = await supabase
    .from("referral_codes")
    .select("code, used_by_id, created_at")
    .eq("creator_id", userId)
    .single();

  if (error && error.code === "PGRST116") {
    return null; // No code exists
  }

  if (error) throw new Error(error.message);
  return data;
};

