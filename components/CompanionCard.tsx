"use client";
import { addBookmark, removeBookmark } from "@/lib/actions/companion.action";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
interface CompanionCardProps {
  id: string;
  name: string;
  topic: string;
  subject: string;
  duration: number;
  color: string;
  isBookMarked: boolean;
}
const CompanionCard = ({
  id,
  name,
  topic,
  subject,
  duration,
  color,
}: CompanionCardProps) => {
  const pathname = usePathname();
  const [isBookMark, setIsBookMark] = useState(false);
  // Check if the companion is bookmarked or not
  useEffect(() => {
    const isBookMarkedLS = localStorage.getItem(`bookmark-${id}`);
    if (isBookMarkedLS !== null) {
      if (isBookMarkedLS === "true") {
        setIsBookMark(true);
      } else {
        setIsBookMark(false);
      }
    } else {
      setIsBookMark(false);
    }
  }, [id, pathname, isBookMark]);
  const handleBookmark = async () => {
    console.log("bookmark value", isBookMark);
    // if the companion is already bookmarked then remove it in the DB and also remove it from the Local storage...
    if (isBookMark) {
      const bookStatus = await removeBookmark(id, pathname);
      setIsBookMark(!isBookMark);
      localStorage.removeItem(`bookmark-${id}`);
    } else {
      // the companion is not bookmarked so add it to the DB and local storage
      const data = await addBookmark(id, pathname);
      setIsBookMark(!isBookMark);
      localStorage.setItem(`bookmark-${id}`, "true");
    }
  };
  return (
    <article className="companion-card" style={{ backgroundColor: color }}>
      <div className="flex justify-between items-center">
        <div className="subject-badge">{subject}</div>
        <button className="companion-bookmark" onClick={handleBookmark}>
          <Image
            src={
              isBookMark ? "/icons/bookmark-filled.svg" : "/icons/bookmark.svg"
            }
            alt="bookmark"
            width={12.5}
            height={15}
          />
        </button>
      </div>
      <h2 className="text-2xl fond-bold">{name}</h2>
      <p className="text-sm">{topic}</p>
      <div className="flex items-center gap-2 mt-3">
        <Image src="icons/clock.svg" alt="clock" width={13.5} height={13.5} />
        <p className="text-sm">{duration} minutes</p>
      </div>
      <Link href={`/companions/${id}`} className="w-full">
        <button className="btn-primary w-full justify-center">
          Launch Lesson
        </button>
      </Link>
    </article>
  );
};

export default CompanionCard;
