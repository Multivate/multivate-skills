import { resolveAvatarUrl } from "@/lib/avatar-url";

type UserAvatarProps = {
  name: string;
  avatarUrl?: string | null;
  className?: string;
  fallbackClassName?: string;
};

export function UserAvatar({
  name,
  avatarUrl,
  className = "h-10 w-10 text-sm",
  fallbackClassName = "bg-slate-100 text-brand-panel dark:bg-slate-800 dark:text-violet-200",
}: UserAvatarProps) {
  const src = resolveAvatarUrl(avatarUrl);
  const initial = (name.trim()[0] ?? "?").toUpperCase();

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" className={`shrink-0 rounded-full object-cover ${className}`} />
    );
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-bold ${className} ${fallbackClassName}`}
      aria-hidden
    >
      {initial}
    </div>
  );
}
