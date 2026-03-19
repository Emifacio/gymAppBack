import type { components } from "@gym/api-client";

export type MemberRead = components["schemas"]["MemberRead"];
export type MembershipPlanRead = components["schemas"]["MembershipPlanRead"];

export type MemberListItem = {
  id: string;
  full_name: string;
  email: string;
  membership_status: components["schemas"]["MembershipStatus"];
  plan_name: string | null;
  plan_id: string | null;
};

export function mapMemberToListItem(member: MemberRead): MemberListItem {
  return {
    id: member.id,
    full_name: member.full_name,
    email: member.email,
    membership_status: member.membership_status,
    plan_name: member.membership_plan?.name ?? null,
    plan_id: member.membership_plan?.id ?? null
  };
}

export function mapMembersToListItems(members: MemberRead[]): MemberListItem[] {
  return members.map(mapMemberToListItem);
}
