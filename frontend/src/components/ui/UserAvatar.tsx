import { resolveAvatarUrl } from "@/lib/avatar-url";
import { avatarFontSize, personAvatarStyle } from "@/lib/person-avatar";

type UserAvatarProps = {
  name: string;
  avatarUrl?: string | null;
  className?: string;
};

export function UserAvatar({
  name,
  avatarUrl,
  className = "h-10 w-10 text-sm",
}: UserAvatarProps) {
  const src = resolveAvatarUrl(avatarUrl);
  const initial = (name.trim()[0] ?? "?").toUpperCase();

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={name} className={`shrink-0 rounded-full object-cover ${className}`} />
    );
  }

  return (
    <span className={`inline-flex shrink-0 ${className}`}>
      <span
        className="inline-flex h-full w-full items-center justify-center rounded-full font-sans font-bold text-white"
        style={{ ...personAvatarStyle(name), color: "#FFFFFF", fontSize: avatarFontSize(className) }}
        aria-hidden
      >
        {initial}
      </span>
    </span>
  );
}
