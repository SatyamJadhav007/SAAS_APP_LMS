import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import {
  getUserXP,
  getUserAchievements,
  checkAndAwardAchievements,
} from "@/lib/actions/achievement.action";
import { ACHIEVEMENT_TYPES, ACHIEVEMENT_XP } from "@/constants/achievements";
import {
  getUserCompanions,
  getUserSessions,
} from "@/lib/actions/companion.action";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, Trophy, Star } from "lucide-react";
import ReferralComponent from "@/components/ReferralComponent";
import Image from "next/image";

const ACHIEVEMENT_DEFINITIONS = [
  {
    type: ACHIEVEMENT_TYPES.COMPANION_CREATED,
    title: "First Companion",
    description: "Create your first learning companion",
    xp: ACHIEVEMENT_XP[ACHIEVEMENT_TYPES.COMPANION_CREATED],
    icon: "🎯",
  },
  {
    type: ACHIEVEMENT_TYPES.LESSONS_5,
    title: "Getting Started",
    description: "Complete 5 lessons overall",
    xp: ACHIEVEMENT_XP[ACHIEVEMENT_TYPES.LESSONS_5],
    icon: "📚",
  },
  {
    type: ACHIEVEMENT_TYPES.SCIENCE_5,
    title: "Science Enthusiast",
    description: "Complete 5 science lessons",
    xp: ACHIEVEMENT_XP[ACHIEVEMENT_TYPES.SCIENCE_5],
    icon: "🔬",
  },
  {
    type: ACHIEVEMENT_TYPES.LESSONS_10,
    title: "Dedicated Learner",
    description: "Complete 10 lessons overall",
    xp: ACHIEVEMENT_XP[ACHIEVEMENT_TYPES.LESSONS_10],
    icon: "🏆",
  },
];

const AchievementsPage = async () => {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  // Get user data
  const [userXP, userAchievements, companions, sessions] = await Promise.all([
    getUserXP(user.id),
    getUserAchievements(user.id),
    getUserCompanions(user.id),
    getUserSessions(user.id),
  ]);

  // Check and award new achievements
  await checkAndAwardAchievements(user.id);

  // Refresh data after checking achievements
  const [updatedXP, updatedAchievements] = await Promise.all([
    getUserXP(user.id),
    getUserAchievements(user.id),
  ]);

  const completedAchievementTypes = new Set(
    updatedAchievements.map((a) => a.achievement_type)
  );

  const totalXP = updatedXP.xp_points;
  const progressPercentage = (totalXP / 100) * 100;
  const isProUnlocked = totalXP >= 100;

  return (
    <main className="min-lg:w-3/4">
      {/* XP Progress Section */}
      <section className="rounded-4xl border border-black p-6 mb-8 bg-gradient-to-br from-primary/10 to-background">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Your Achievements</h1>
            <p className="text-muted-foreground">
              Complete tasks to earn XP and unlock Pro subscription at 100 XP!
            </p>
          </div>
          {isProUnlocked && (
            <div className="flex items-center gap-2 bg-cta-gold rounded-4xl px-4 py-2">
              <Trophy className="size-5 text-black" />
              <span className="font-bold text-black">Pro Unlocked!</span>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Star className="size-6 text-primary" />
              <span className="text-2xl font-bold">{totalXP} / 100 XP</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {100 - totalXP} XP to Pro
            </span>
          </div>
          <Progress value={progressPercentage} className="h-4" />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Image src="/icons/check.svg" alt="check" width={16} height={16} />
            <span>
              {updatedAchievements.length} of {ACHIEVEMENT_DEFINITIONS.length}{" "}
              achievements completed
            </span>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Achievements List */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-2xl font-bold mb-4">Available Tasks</h2>
          <div className="space-y-4">
            {ACHIEVEMENT_DEFINITIONS.map((achievement) => {
              const isCompleted = completedAchievementTypes.has(
                achievement.type
              );
              const userAchievement = updatedAchievements.find(
                (a) => a.achievement_type === achievement.type
              );

              return (
                <Card
                  key={achievement.type}
                  className={`rounded-4xl border border-black transition-all ${
                    isCompleted
                      ? "bg-primary/5 border-primary"
                      : "bg-white hover:shadow-md"
                  }`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div
                        className={`size-12 rounded-lg flex items-center justify-center text-2xl ${
                          isCompleted
                            ? "bg-primary/20"
                            : "bg-muted border border-black"
                        }`}
                      >
                        {achievement.icon}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <CardTitle className="text-xl font-bold">
                            {achievement.title}
                          </CardTitle>
                          {isCompleted ? (
                            <CheckCircle2 className="size-6 text-green-600" />
                          ) : (
                            <Circle className="size-6 text-muted-foreground" />
                          )}
                        </div>
                        <CardDescription className="text-base mb-3">
                          {achievement.description}
                        </CardDescription>
                        <div className="flex items-center gap-2">
                          <Star className="size-4 text-primary" />
                          <span className="font-semibold text-primary">
                            +{achievement.xp} XP
                          </span>
                          {isCompleted && userAchievement && (
                            <span className="text-sm text-muted-foreground ml-2">
                              Completed on{" "}
                              {new Date(
                                userAchievement.completed_at
                              ).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Referral Component */}
        <div className="lg:col-span-1">
          <ReferralComponent />
        </div>
      </div>

      {/* Stats Section */}
      <section className="mt-8 rounded-4xl border border-black p-6">
        <h2 className="text-2xl font-bold mb-4">Your Progress</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="border border-black rounded-lg p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Image
                src="/icons/cap.svg"
                alt="companions"
                width={22}
                height={22}
              />
              <p className="text-2xl font-bold">{companions.length}</p>
            </div>
            <div className="text-sm text-muted-foreground">
              Companions Created
            </div>
          </div>
          <div className="border border-black rounded-lg p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Image
                src="/icons/check.svg"
                alt="lessons"
                width={22}
                height={22}
              />
              <p className="text-2xl font-bold">{sessions.length}</p>
            </div>
            <div className="text-sm text-muted-foreground">
              Lessons Completed
            </div>
          </div>
          <div className="border border-black rounded-lg p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Star className="size-5 text-primary" />
              <p className="text-2xl font-bold">{totalXP}</p>
            </div>
            <div className="text-sm text-muted-foreground">Total XP</div>
          </div>
          <div className="border border-black rounded-lg p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Trophy className="size-5 text-primary" />
              <p className="text-2xl font-bold">
                {updatedAchievements.length}
              </p>
            </div>
            <div className="text-sm text-muted-foreground">Achievements</div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default AchievementsPage;

