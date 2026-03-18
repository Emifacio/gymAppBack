import type {
  BookingRecord,
  Member,
  MemberSubscriptionStatus,
  Workout as ApiClientWorkout,
} from "@gym/api-client";

export interface OnboardingMetadata {
  onboarding_completed?: boolean;
  [key: string]: unknown;
}

export interface Profile extends Member {
  profile_metadata?: OnboardingMetadata;
}

export type Booking = BookingRecord;
export type Workout = ApiClientWorkout;
export type Subscription = MemberSubscriptionStatus;

export type PartialProfileUpdate = {
  full_name?: string | null;
  phone?: string | null;
  profile_metadata?: OnboardingMetadata;
  profile_image_url?: string | null;
};
