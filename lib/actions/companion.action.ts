"use server";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseClient } from "../supabase";
import { revalidatePath } from "next/cache";
import { getUserXP } from "./achievement.action";
import { checkAndAwardAchievements } from "./achievement.action";
// SERVER ACTION FOR CREATING A COMPANION
export const createCompanion = async (formData: CreateCompanion) => {
  // Getting the userId using the auth function of the clerk
  const { userId: author } = await auth();
  // Creating a supabase client using the built-in function
  const supabase = createSupabaseClient();
  // retriving current data and also pushing it into the companions table
  // for context,formData is the parameter right here which we pass on the onClick action of the form
  const { data, error } = await supabase
    .from("companions")
    .insert({ ...formData, author })
    .select();
  if (error || !data) {
    throw new Error(error?.message || "Failed to create a companion");
  }
  // Check and award achievements after companion creation
  try {
    await checkAndAwardAchievements(author);
    revalidatePath("/achievements");
  } catch (error) {
    console.error("Error checking achievements:", error);
  }
  return data[0];
};

// FETCHES ALL THE COMPANIONS FROM THE DATABASE
export const getAllCompanions = async ({
  limit = 10,
  page = 1,
  subject,
  topic,
}: GetAllCompanions) => {
  // current user referance ...
  const supabase = createSupabaseClient();
  // select * from companions;
  let query = supabase.from("companions").select();
  // if subject and topic both exist
  if (subject && topic) {
    //filter for only subject that match for the current user's subject and topics if any
    query = query
      .ilike("subject", `%${subject}%`) // here the search for topic was also done in the name column
      .or(`topic.ilike.%${topic}%,name.ilike.%${topic}%`);
  } else if (subject) {
    query = query.ilike("subject", `%${subject}%`);
  } else if (topic) {
    query = query.or(`topic.ilike.%${topic}%,name.ilike.%${topic}%`);
  }
  // pagination ...
  query = query.range((page - 1) * limit, page * limit - 1);
  // fetching the data for the called query....
  const { data: companions, error } = await query;
  if (error) {
    throw new Error(error.message);
  }
  return companions;
};

// FETCHING A SINGLE COMPANION ON THE BASIS OF THE USER ID
export const getCompanion = async (id: string) => {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("companions")
    .select()
    .eq("id", id);
  if (error) console.log(error);
  return data && data.length > 0 ? data[0] : null;
};

// ADDING SESSION HISTORY FOR THE COMPANION
export const addToSessionHistory = async (companionId: string) => {
  const { userId } = await auth();
  const supabase = createSupabaseClient();
  // INSERT INTO session_history VALUES (companion_id,user_id);
  const { data, error } = await supabase
    .from("session_history")
    .insert({ companion_id: companionId, user_id: userId });

  if (error) throw new Error(error.message);
  
  // Check and award achievements after session completion
  try {
    const { checkAndAwardAchievements } = await import("./achievement.action");
    await checkAndAwardAchievements(userId);
    revalidatePath("/achievements");
  } catch (error) {
    console.error("Error checking achievements:", error);
  }
  
  return data;
};

// FETCING RECENT SESSIONS (ALL USERS)
export const getRecentSessions = async (limit = 10) => {
  const supabase = createSupabaseClient();
  // SELECT c.* FROM session_history s INNER JOIN companions c ON s.companion_id=c.id ORDER BY s.created_at DESC LIMIT 10;
  const { data, error } = await supabase
    .from("session_history")
    .select(`companions:companion_id (*)`)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data.map(({ companions }) => companions);
};

// FETCING RECENT SESSIONS (A SPECIFIC/CURRENT USER)
export const getUserSessions = async (userId: string, limit = 10) => {
  const supabase = createSupabaseClient();
  // SELECT c.* FROM session_history s INNER JOIN companions c ON s.companion_id=c.id WHERE s.user_id=${userId} ORDER BY s.created_at DESC LIMIT 10;
  const { data, error } = await supabase
    .from("session_history")
    .select(`companions:companion_id (*)`)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data.map(({ companions }) => companions);
};

// FETCHING COMPANIONS CREATED BY THE CURRENT USER(BASIS OF THE AUTHOR COLUMN I.E. LOGGEDINUSER)
export const getUserCompanions = async (userId: string) => {
  const supabase = createSupabaseClient();
  //SELECT * FROM companions WHERE author=${userId};
  const { data, error } = await supabase
    .from("companions")
    .select()
    .eq("author", userId);
  if (error) throw new Error(error.message);
  return data;
};

//CHECK FOR COMPANION LIMIT (ON THE BASIS OF THE CURRENT SUBCRIPTION PLAN)
export const newCompanionPermissions = async () => {
  const { userId, has } = await auth();
  const supabase = createSupabaseClient();
  let limit = 0;

  if (!userId) return false;

  // Treat users with Pro plan OR 100+ XP as Pro
  const userXp = await getUserXP(userId);
  const isXpPro = userXp.xp_points >= 100;

  if (has({ plan: "pro" }) || isXpPro) {
    return true;
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

export const newConversationPermissions = async () => {
  const { userId, has } = await auth();
  if (!userId) return false;

  // Treat users with Pro/Core plan OR 100+ XP as unlimited
  const userXp = await getUserXP(userId);
  const isXpPro = userXp.xp_points >= 100;

  if (has({ plan: "pro" }) || has({ plan: "core" }) || isXpPro) {
    return true;
  }

  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("session_history")
    .select("id", { count: "exact" })
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  const convCnt = data?.length;
  return convCnt < 10;
};

// ADD BOOKMARK
export const addBookmark = async (companionId: string, path: string) => {
  const { userId } = await auth();
  if (!userId) return;
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("bookmarks")
    .insert({ companion_id: companionId, user_id: userId, isMarked: true });
  if (error) {
    throw new Error(error.message);
  }
  revalidatePath(path);
  console.log("Data-AddAction-Bookmark", data);
  return data;
};

//REMOVE BOOKMARK
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
// FETCHING ALL THE BOOKMARKS OF THE CURRENT USER
export const getBookmarkedCompanions = async (userId: string) => {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("bookmarks")
    .select(`companions:companion_id (*)`)
    .eq("user_id", userId);
  if (error) {
    throw new Error(error.message);
  }
  // We don't need the bookmarks data, so we return only the companions
  return data.map(({ companions }) => companions);
};
