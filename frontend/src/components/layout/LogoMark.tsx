import Image from "next/image";
import mainLogo from "../../../public/MULTIVATE MAIN LOGO.png";
import whiteLogo from "../../../public/MULTIVATE LOGO WHITE.png";

type LogoMarkProps = {
  className?: string;
  variant?: "default" | "inverse" | "color";
  size?: "default" | "sm" | "md";
  priority?: boolean;
};

const sizeClass = {
  default: "h-8 w-auto max-h-10 object-contain object-left sm:h-9 lg:h-10",
  sm: "h-4 w-auto max-h-4 object-contain object-left",
  md: "h-6 w-auto max-h-7 object-contain object-left",
};

export function LogoMark({
  className = "",
  variant = "default",
  size = "default",
  priority = false,
}: LogoMarkProps) {
  const sizing = sizeClass[size];
  if (variant === "inverse") {
    return (
      <Image
        src={whiteLogo}
        alt="Multivate"
        priority={priority}
        className={`${sizing} ${className}`.trim()}
      />
    );
  }

  if (variant === "color") {
    return (
      <Image
        src={mainLogo}
        alt="Multivate"
        priority={priority}
        className={`${sizing} ${className}`.trim()}
      />
    );
  }

  return (
    <>
      <Image
        src={mainLogo}
        alt="Multivate"
        priority={priority}
        className={`${sizing} dark:hidden ${className}`.trim()}
      />
      <Image
        src={whiteLogo}
        alt=""
        aria-hidden
        priority={priority}
        className={`${sizing} hidden dark:block ${className}`.trim()}
      />
    </>
  );
}

export function LogoTile({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[14px] shadow-[0_2px_8px_rgba(16,36,79,0.12)] ${className}`.trim()}
      style={{ backgroundColor: "#ffffff" }}
    >
      <Image src={mainLogo} alt="Multivate" className="h-full w-full object-contain p-[14%]" />
    </span>
  );
}
