import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  href?: string;
  className?: string;
  imageClassName?: string;
  textClassName?: string;
  showText?: boolean;
  onClick?: () => void;
}

export function Logo({
  href,
  className,
  imageClassName,
  textClassName,
  showText = true,
  onClick,
}: LogoProps) {
  const content = (
    <div className={cn("flex items-center gap-3", className)}>
      <Image
        src="/logo.png"
        alt="Phyat"
        width={150}
        height={150}
        className={cn("shrink-0 rounded-md object-contain", imageClassName)}
        priority
      />
      {showText && (
        <span
          className={cn(
            "text-2xl font-extrabold tracking-tightest",
            textClassName,
          )}
        >
          <span className="text-primary">Phy</span>
          <span className="text-foreground">at</span>
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="flex min-w-0 items-center"
        aria-label="Phyat home"
        onClick={onClick}
      >
        {content}
      </Link>
    );
  }

  return content;
}
