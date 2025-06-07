import CompanionComponent from "@/components/CompanionComponent";
import { getCompanion } from "@/lib/actions/companion.action";
import { getSubjectColor } from "@/lib/utils";
import { currentUser } from "@clerk/nextjs/server";
import Image from "next/image";
import { redirect } from "next/navigation";
import React from "react";
interface CompanionSessionPageProps {
  // here,in the interface the "id" is the dynamic param extracted from the url
  params: Promise<{ id: string }>;
}
//params-> /url/{id}
// searchParams->/url?key1=value1&key2=value2...
const CompanionSession = async ({ params }: CompanionSessionPageProps) => {
  const { id } = await params;
  const companion = await getCompanion(id);
  // if not logged in  then redirect to sign in page
  // also redirect if the companion is not found
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  if (!companion) redirect("/companions");
  console.info(companion);
  // console.info(user.imageUrl);
  // console.info(user.firstName);
  return (
    <main>
      <article className="flex rounded-border justify-between p-6 max-md:flex-col">
        <div className="flex items-center gap-2">
          {/* the div(subject badge) is hidden on small screen devices....  */}
          <div
            className="size-[72px] flex items-center justify-center rounded-lg max-md:hidden"
            style={{ backgroundColor: getSubjectColor(companion.subject) }}
          >
            <Image
              src={`/icons/${companion.subject}.svg`}
              alt={companion.subject}
              width={35}
              height={35}
            />
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <p className="font-bold text-2xl">{companion.name}</p>
              {/* the subject Name is also hidden on small screen devices */}
              <div className="subject-badge max-sm:hidden">
                {companion.subject}
              </div>
            </div>
            <p className="text-lg">{companion.topic}</p>
          </div>
        </div>
        <div className="items-start text-2xl max-md:hidden">
          {companion.duration} minutes
        </div>
      </article>
      <CompanionComponent
        {...companion}
        companionId={companion.id}
        userName={user.firstName!}
        userImage={user.imageUrl!}
      />
    </main>
  );
};

export default CompanionSession;
