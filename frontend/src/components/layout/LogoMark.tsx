import Image from "next/image";
import mainLogo from "../../../public/MULTIVATE MAIN LOGO.png";
import whiteLogo from "../../../public/MULTIVATE LOGO WHITE.png";

type LogoMarkProps = {
  className?: string;
  variant?: "default" | "inverse";
  priority?: boolean;
};

const sizeClass = "h-8 w-auto max-h-10 object-contain object-left sm:h-9 lg:h-10";

export function LogoMark({
  className = "",
  variant = "default",
  priority = false,
}: LogoMarkProps) {
  if (variant === "inverse") {
    return (
      <Image
        src={whiteLogo}
        alt="Multivate"
        priority={priority}
        className={`${sizeClass} ${className}`.trim()}
      />
    );
  }

  return (
    <>
      <Image
        src={mainLogo}
        alt="Multivate"
        priority={priority}
        className={`${sizeClass} dark:hidden ${className}`.trim()}
      />
      <Image
        src={whiteLogo}
        alt=""
        aria-hidden
        priority={priority}
        className={`${sizeClass} hidden dark:block ${className}`.trim()}
      />
    </>
  );
}
