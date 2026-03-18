import { useState } from "react";

import { getAvatarData, DEFAULT_AVATAR_URL } from "@/lib/avatar";
import type { Member } from "@gym/api-client";

interface AvatarProps {
  member?: Member | null | undefined;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showInitialsFallback?: boolean;
}

const sizeClasses = {
  sm: "h-8 w-8 text-[10px]",
  md: "h-10 w-10 text-xs",
  lg: "h-12 w-12 text-sm",
  xl: "h-20 w-20 text-lg",
};

export function Avatar({ member, size = "md", className = "", showInitialsFallback = true }: AvatarProps) {
  const [imgError, setImgError] = useState(false);
  const memberData = member ?? undefined;
  const avatarData = getAvatarData(memberData);

  const showImage = avatarData.imageUrl && !imgError;
  const showInitials = !showImage && showInitialsFallback;

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--ink-100)] ${sizeClasses[size]} ${className}`}
    >
      {showImage && (
        <img
          src={avatarData.imageUrl ?? ""}
          alt={member?.full_name ?? "Avatar"}
          className="h-full w-full object-cover"
          onError={() => setImgError(true)}
        />
      )}
      {showInitials && (
        <span className="font-bold text-[var(--ink-700)]">
          {avatarData.initials}
        </span>
      )}
      {!showImage && !showInitials && (
        <img
          src={DEFAULT_AVATAR_URL}
          alt="Default avatar"
          className="h-full w-full object-cover"
        />
      )}
    </div>
  );
}
