import CompanionCard from "@/components/CompanionCard";
import SearchInput from "@/components/SearchInput";
import SubjectFilter from "@/components/SubjectFilter";
import { getAllCompanions } from "@/lib/actions/companion.action";
import { getSubjectColor } from "@/lib/utils";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import React from "react";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

const CompanionsLibrary = async ({ searchParams }: SearchParams) => {
  // all the params present in the url....
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  const filters = await searchParams;
  // specifics...(subject and topic....)
  const subject = filters.subject ? filters.subject : "";
  const topic = filters.topic ? filters.topic : "";
  // Getting the companions on the basis of the topic and the subject of the parameters....
  const companions = await getAllCompanions({ subject, topic });
  //console.log(companions);
  return (
    <main>
      <section className="flex justify-between gap-4 max-sm:flex-col">
        <h1>Companion Library</h1>
        <div className="flex gap-4 ">
          <SearchInput />
          <SubjectFilter />
        </div>
      </section>
      <section className="companions-grid">
        {/* Mapping over the companions fetched via the server action  */}
        {companions.map((companion) => (
          <CompanionCard
            key={companion.id}
            {...companion}
            color={getSubjectColor(companion.subject)}
          />
        ))}
      </section>
    </main>
  );
};

export default CompanionsLibrary;
