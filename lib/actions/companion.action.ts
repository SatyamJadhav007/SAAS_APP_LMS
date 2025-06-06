"use server";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseClient } from "../supabase";
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
