import Image from "next/image";
import { BookOpen } from "lucide-react";
import { resolveCourseImageUrl } from "@/lib/course-image";

type Props = {
  src: string | null | undefined;
  alt: string;
  className?: string;
  sizes?: string;
};

export function CourseThumbnail({ src, alt, className = "object-cover", sizes = "80px" }: Props) {
  const resolved = resolveCourseImageUrl(src);

  if (!resolved) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-100 text-brand-secondary dark:bg-slate-800">
        <BookOpen className="h-5 w-5 opacity-70" aria-hidden />
      </div>
    );
  }

  return <Image src={resolved} alt={alt} fill className={className} sizes={sizes} />;
}
