// Achievement types and their XP values
export const ACHIEVEMENT_TYPES = {
    COMPANION_CREATED: "companion_created",
    LESSONS_5: "lessons_5",
    SCIENCE_5: "science_5",
    LESSONS_10: "lessons_10",
  } as const;
  
  export const ACHIEVEMENT_XP = {
    [ACHIEVEMENT_TYPES.COMPANION_CREATED]: 10,
    [ACHIEVEMENT_TYPES.LESSONS_5]: 25,
    [ACHIEVEMENT_TYPES.SCIENCE_5]: 30,
    [ACHIEVEMENT_TYPES.LESSONS_10]: 55,
  } as const;
  
 export const MAX_XP = 100;