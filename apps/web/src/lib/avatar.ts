import type { Member } from "@gym/api-client";

export const DEFAULT_AVATAR_URL = "https://api.dicebear.com/7.x/initials/svg?backgroundColor=ff7a59&textColor=ffffff";

export interface AvatarData {
  imageUrl: string | null;
  initials: string;
  hasCustomImage: boolean;
  hasGoogleImage: boolean;
}

function getInitials(name: string | undefined): string {
  if (!name) return "?";
  
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0]!.substring(0, 2).toUpperCase();
  }
  
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
}

export function getAvatarData(member: Member | undefined): AvatarData {
  if (!member) {
    return {
      imageUrl: null,
      initials: "?",
      hasCustomImage: false,
      hasGoogleImage: false,
    };
  }

  const initials = getInitials(member.full_name);
  
  const memberAny = member as Member & Record<string, unknown>;
  const customImage = typeof memberAny.profile_image_url === "string" ? memberAny.profile_image_url : null;
  const googleImage = typeof memberAny.google_picture_url === "string" ? memberAny.google_picture_url : null;

  const hasCustomImage = Boolean(customImage);
  const hasGoogleImage = Boolean(googleImage);

  const imageUrl = customImage || googleImage || null;

  return {
    imageUrl,
    initials,
    hasCustomImage,
    hasGoogleImage,
  };
}

export function getAvatarUrl(member: Member | undefined): string {
  const data = getAvatarData(member);
  return data.imageUrl ?? DEFAULT_AVATAR_URL;
}
