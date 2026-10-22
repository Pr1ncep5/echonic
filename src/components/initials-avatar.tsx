import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface InitialsAvatarProps {
  name: string;
  image?: string | null;
  shape?: "circle" | "rounded";
  size?: "sm" | "default" | "lg";
  className?: string;
}

function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters =
    words.length > 1 ? [words[0][0], words[1][0]] : [...(words[0] ?? "?")].slice(0, 2);
  return letters.join("").toUpperCase();
}

export function InitialsAvatar({
  name,
  image,
  shape = "circle",
  size = "default",
  className,
}: InitialsAvatarProps) {
  const rounded = shape === "rounded" && "rounded-md after:rounded-md";

  return (
    <Avatar size={size} className={cn(rounded, className)}>
      {image && <AvatarImage src={image} alt="" className={cn(rounded)} />}
      <AvatarFallback
        className={cn(
          "bg-muted font-medium text-foreground/70 group-data-[size=sm]/avatar:text-[10px]",
          rounded,
        )}
      >
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
