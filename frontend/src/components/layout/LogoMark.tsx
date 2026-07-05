import Image from "next/image";
import mainLogo from "../../../public/MULTIVATE MAIN LOGO.png";
import whiteLogo from "../../../public/MULTIVATE LOGO WHITE.png";

type LogoMarkProps = {
  className?: string;
  variant?: "default" | "inverse";
  priority?: boolean;
};

export function LogoMark({
  className = "",
  variant = "default",
  priority = false,
}: LogoMarkProps) {
  const src = variant === "inverse" ? whiteLogo : mainLogo;

  return (
    <Image
      src={src}
      alt="Multivate"
      priority={priority}
      className={`h-8 w-auto max-h-10 object-contain object-left sm:h-9 lg:h-10 ${className}`.trim()}
    />
  );
}
