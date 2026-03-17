import type {
  BookingRecord,
  Member,
  MemberSubscriptionStatus,
  Workout as ApiClientWorkout,
  MemberUpdatePayload
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

export type PartialProfileUpdate = Pick<MemberUpdatePayload, "full_name" | "phone" | "email"> & {
  profile_metadata?: OnboardingMetadata;
};
