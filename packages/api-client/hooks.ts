import { queryOptions, useMutation, useQuery, useQueryClient, type UseMutationOptions } from "@tanstack/react-query";

import { toAuthSession, type AuthSession, type SessionManager } from "./auth";
import {
  isApiResponseError,
  unwrapResult,
  type AttendancePayload,
  type AttendanceRecord,
  type BookingAction,
  type BookingCancellation,
  type BookingPayload,
  type ClassAssignmentPayload,
  type ClassMember,
  type GymApiClient,
  type LoginPayload,
  type GoogleLoginPayload,
  type Member,
  type MemberBookings,
  type MemberCreatePayload,
  type MemberFilters,
  type MemberSubscription,
  type MemberSubscriptionStatus,
  type MemberUpdatePayload,
  type Plan,
  type PlanCreatePayload,
  type PlanUpdatePayload,
  type RegisterPayload,
  type SubscriptionAssignPayload,
  type Workout,
  type WorkoutCreatePayload,
  type WorkoutFilters,
  type WorkoutUpdatePayload
} from "./client";

export const gymKeys = {
  all: ["gym"] as const,
  workouts: () => [...gymKeys.all, "workouts"] as const,
  workoutList: (filters: WorkoutFilters = {}) => [...gymKeys.workouts(), "list", filters] as const,
  workoutDetail: (workoutId: string) => [...gymKeys.workouts(), "detail", workoutId] as const,
  members: () => [...gymKeys.all, "members"] as const,
  memberList: (filters: MemberFilters = {}) => [...gymKeys.members(), "list", filters] as const,
  memberDetail: (memberId: string) => [...gymKeys.members(), "detail", memberId] as const,
  memberBookings: (memberId: string) => [...gymKeys.all, "member-bookings", memberId] as const,
  memberSubscription: (memberId: string) => [...gymKeys.all, "member-subscription", memberId] as const,
  memberSelfSubscription: () => [...gymKeys.all, "member-self-subscription"] as const,
  memberAttendance: (memberId: string) => [...gymKeys.all, "member-attendance", memberId] as const,
  classAttendance: (classId: string) => [...gymKeys.all, "class-attendance", classId] as const,
  classMembers: (classId: string) => [...gymKeys.all, "class-members", classId] as const,
  plans: () => [...gymKeys.all, "plans"] as const,
  planList: (filters: { active?: boolean | null; offset?: number; limit?: number } = {}) =>
    [...gymKeys.plans(), "list", filters] as const,
  dashboard: (memberId: string | undefined) =>
    [...gymKeys.all, "dashboard", memberId ?? "anonymous"] as const
};

export interface CreateApiHooksOptions {
  client: GymApiClient;
  sessionManager?: SessionManager;
}

export function getWorkoutsQueryOptions(client: GymApiClient, filters: WorkoutFilters = {}) {
  return queryOptions({
    queryKey: gymKeys.workoutList(filters),
    queryFn: () => unwrapResult<Workout[]>(client.GET("/classes", { params: { query: filters } }))
  });
}

export function getWorkoutQueryOptions(client: GymApiClient, workoutId: string) {
  return queryOptions({
    queryKey: gymKeys.workoutDetail(workoutId),
    queryFn: () =>
      unwrapResult<Workout>(
        client.GET("/classes/{class_id}", { params: { path: { class_id: workoutId } } })
      )
  });
}

export function getMembersQueryOptions(client: GymApiClient, filters: MemberFilters = {}) {
  return queryOptions({
    queryKey: gymKeys.memberList(filters),
    queryFn: () => unwrapResult<Member[]>(client.GET("/members", { params: { query: filters } }))
  });
}

export function getMemberQueryOptions(client: GymApiClient, memberId: string) {
  return queryOptions({
    queryKey: gymKeys.memberDetail(memberId),
    queryFn: () =>
      unwrapResult<Member>(client.GET("/members/{member_id}", { params: { path: { member_id: memberId } } }))
  });
}

export function getMemberBookingsQueryOptions(client: GymApiClient, memberId: string) {
  const untypedClient = client as any;
  return queryOptions({
    queryKey: gymKeys.memberBookings(memberId),
    queryFn: () =>
      unwrapResult<MemberBookings>(
        untypedClient.GET("/members/{member_id}/bookings", {
          params: { path: { member_id: memberId } }
        })
      )
  });
}

export function getMemberSubscriptionQueryOptions(client: GymApiClient, memberId: string) {
  const untypedClient = client as any;
  return queryOptions({
    queryKey: gymKeys.memberSubscription(memberId),
    queryFn: async () => {
      try {
        return await unwrapResult<MemberSubscription | null>(
          untypedClient.GET("/members/{member_id}/subscription", {
            params: { path: { member_id: memberId } }
          })
        );
      } catch (error) {
        if (isApiResponseError(error) && error.status === 404) {
          return null;
        }
        throw error;
      }
    }
  });
}

export function getMemberSelfSubscriptionQueryOptions(client: GymApiClient) {
  const untypedClient = client as any;
  return queryOptions({
    queryKey: gymKeys.memberSelfSubscription(),
    queryFn: () =>
      unwrapResult<MemberSubscriptionStatus>(
        untypedClient.GET("/members/me/subscription")
      )
  });
}

export function getMemberAttendanceQueryOptions(client: GymApiClient, memberId: string) {
  return queryOptions({
    queryKey: gymKeys.memberAttendance(memberId),
    queryFn: () =>
      unwrapResult<AttendanceRecord[]>(
        client.GET("/attendance/member/{member_id}", { params: { path: { member_id: memberId } } })
      )
  });
}

export function getClassAttendanceQueryOptions(client: GymApiClient, classId: string) {
  return queryOptions({
    queryKey: gymKeys.classAttendance(classId),
    queryFn: () =>
      unwrapResult<AttendanceRecord[]>(
        client.GET("/attendance/class/{class_id}", { params: { path: { class_id: classId } } })
      )
  });
}

export function getClassMembersQueryOptions(client: GymApiClient, classId: string) {
  const untypedClient = client as any;
  return queryOptions({
    queryKey: gymKeys.classMembers(classId),
    queryFn: () =>
      unwrapResult<ClassMember[]>(
        untypedClient.GET("/classes/{class_id}/members", {
          params: { path: { class_id: classId } }
        })
      )
  });
}

export function getPlansQueryOptions(
  client: GymApiClient,
  filters: { active?: boolean | null; offset?: number; limit?: number } = {}
) {
  const untypedClient = client as any;
  const query = Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== null && value !== undefined)
  );
  return queryOptions({
    queryKey: gymKeys.planList(filters),
    queryFn: () =>
      unwrapResult<Plan[]>(
        untypedClient.GET("/plans", {
          params: { query }
        })
      )
  });
}

export function createApiHooks({ client, sessionManager }: CreateApiHooksOptions) {
  function useWorkouts(filters: WorkoutFilters = {}) {
    return useQuery(getWorkoutsQueryOptions(client, filters));
  }

  function useWorkout(workoutId: string) {
    return useQuery({
      ...getWorkoutQueryOptions(client, workoutId),
      retry: 0
    });
  }

  function useMembers(filters: MemberFilters = {}) {
    return useQuery(getMembersQueryOptions(client, filters));
  }

  function useMember(memberId: string) {
    return useQuery(getMemberQueryOptions(client, memberId));
  }

  function useMemberBookings(memberId: string, opts: { enabled?: boolean } = {}) {
    return useQuery({
      ...getMemberBookingsQueryOptions(client, memberId),
      enabled: Boolean(memberId) && (opts.enabled ?? true),
      ...opts
    });
  }

  function useMemberSubscription(memberId: string, opts: { enabled?: boolean } = {}) {
    return useQuery({
      ...getMemberSubscriptionQueryOptions(client, memberId),
      enabled: Boolean(memberId) && (opts.enabled ?? true),
      ...opts
    });
  }

  function useMySubscriptionStatus(opts: { enabled?: boolean } = {}) {
    return useQuery({
      ...getMemberSelfSubscriptionQueryOptions(client),
      enabled: opts.enabled ?? true,
      ...opts
    });
  }

  function useMemberAttendance(memberId: string) {
    return useQuery(getMemberAttendanceQueryOptions(client, memberId));
  }

  function useClassAttendance(classId: string, enabled = true) {
    return useQuery({
      ...getClassAttendanceQueryOptions(client, classId),
      enabled: enabled && Boolean(classId),
      retry: 0
    });
  }

  function useClassMembers(classId: string, enabled = true) {
    return useQuery({
      ...getClassMembersQueryOptions(client, classId),
      enabled,
      retry: 0
    });
  }

  function usePlans(filters: { active?: boolean | null; offset?: number; limit?: number } = {}) {
    return useQuery(getPlansQueryOptions(client, filters));
  }

  function useLogin(
    options: Omit<UseMutationOptions<AuthSession, Error, LoginPayload>, "mutationFn"> = {}
  ) {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (payload: LoginPayload) => {
        const response = await unwrapResult(client.POST("/auth/login", { body: payload }));
        const session = toAuthSession(response);

        if (sessionManager) {
          await sessionManager.setSession(session);
        }

        return session;
      },
      ...options,
      onSuccess: async (session, variables, onMutateResult, context) => {
        await queryClient.invalidateQueries({ queryKey: gymKeys.dashboard(session.member.id) });
        await queryClient.invalidateQueries({ queryKey: gymKeys.workouts() });
        await queryClient.invalidateQueries({ queryKey: gymKeys.memberSelfSubscription() });
        await options.onSuccess?.(session, variables, onMutateResult, context);
      }
    });
  }

  function useGoogleLogin(
    options: Omit<UseMutationOptions<AuthSession, Error, GoogleLoginPayload>, "mutationFn"> = {}
  ) {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (payload: GoogleLoginPayload) => {
        const response = await unwrapResult(client.POST("/auth/google-login", { body: payload }));
        const session = toAuthSession(response);

        if (sessionManager) {
          await sessionManager.setSession(session);
        }

        return session;
      },
      ...options,
      onSuccess: async (session, variables, onMutateResult, context) => {
        await queryClient.invalidateQueries({ queryKey: gymKeys.dashboard(session.member.id) });
        await queryClient.invalidateQueries({ queryKey: gymKeys.workouts() });
        await queryClient.invalidateQueries({ queryKey: gymKeys.memberSelfSubscription() });
        await options.onSuccess?.(session, variables, onMutateResult, context);
      }
    });
  }

  function useRegister(
    options: Omit<UseMutationOptions<AuthSession, Error, RegisterPayload>, "mutationFn"> = {}
  ) {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (payload: RegisterPayload) => {
        const response = await unwrapResult(client.POST("/auth/register", { body: payload }));
        const session = toAuthSession(response);

        if (sessionManager) {
          await sessionManager.setSession(session);
        }

        return session;
      },
      ...options,
      onSuccess: async (session, variables, onMutateResult, context) => {
        await queryClient.invalidateQueries({ queryKey: gymKeys.dashboard(session.member.id) });
        await queryClient.invalidateQueries({ queryKey: gymKeys.workouts() });
        await queryClient.invalidateQueries({ queryKey: gymKeys.memberSelfSubscription() });
        await options.onSuccess?.(session, variables, onMutateResult, context);
      }
    });
  }

  function useCreateBooking(
    options: Omit<UseMutationOptions<BookingAction, Error, { classId: string; memberId?: string }>, "mutationFn"> = {}
  ) {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: ({ classId, memberId }) =>
        unwrapResult<BookingAction>(
          (client as any).POST("/bookings", {
            body: { class_id: classId, member_id: memberId }
          })
        ),
      ...options,
      onSuccess: async (result, variables, onMutateResult, context) => {
        await queryClient.invalidateQueries({ queryKey: gymKeys.workouts() });
        await queryClient.invalidateQueries({ queryKey: gymKeys.workoutDetail(variables.classId) });

        if (variables.memberId) {
          await queryClient.invalidateQueries({
            queryKey: gymKeys.memberBookings(variables.memberId)
          });
          await queryClient.invalidateQueries({
            queryKey: gymKeys.memberSubscription(variables.memberId)
          });
          await queryClient.invalidateQueries({
            queryKey: gymKeys.dashboard(variables.memberId)
          });
        }
        await queryClient.invalidateQueries({ queryKey: gymKeys.memberSelfSubscription() });

        await options.onSuccess?.(result, variables, onMutateResult, context);
      }
    });
  }

  function useCancelBooking(
    options: Omit<UseMutationOptions<BookingCancellation, Error, { bookingId: string; memberId: string }>, "mutationFn"> = {}
  ) {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: ({ bookingId }) =>
        unwrapResult<BookingCancellation>(
          (client as any).DELETE("/bookings/{booking_id}", {
            params: { path: { booking_id: bookingId } }
          })
        ),
      ...options,
      onSuccess: async (result, variables, onMutateResult, context) => {
        await queryClient.invalidateQueries({ queryKey: gymKeys.workouts() });
        await queryClient.invalidateQueries({ queryKey: gymKeys.memberBookings(variables.memberId) });
        await queryClient.invalidateQueries({ queryKey: gymKeys.memberSubscription(variables.memberId) });
        await queryClient.invalidateQueries({ queryKey: gymKeys.dashboard(variables.memberId) });
        await queryClient.invalidateQueries({ queryKey: gymKeys.memberSelfSubscription() });
        await options.onSuccess?.(result, variables, onMutateResult, context);
      }
    });
  }

  function useCreateMember(
    options: Omit<UseMutationOptions<Member, Error, MemberCreatePayload>, "mutationFn"> = {}
  ) {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: (payload: MemberCreatePayload) =>
        unwrapResult<Member>(client.POST("/members", { body: payload })),
      ...options,
      onSuccess: async (result, variables, onMutateResult, context) => {
        await queryClient.invalidateQueries({ queryKey: gymKeys.members() });
        await options.onSuccess?.(result, variables, onMutateResult, context);
      }
    });
  }

  function useUpdateMember(
    options: Omit<
      UseMutationOptions<Member, Error, { memberId: string; payload: MemberUpdatePayload }>,
      "mutationFn"
    > = {}
  ) {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: ({ memberId, payload }) =>
        unwrapResult<Member>(
          client.PATCH("/members/{member_id}", {
            params: { path: { member_id: memberId } },
            body: payload
          })
        ),
      ...options,
      onSuccess: async (result, variables, onMutateResult, context) => {
        await queryClient.invalidateQueries({ queryKey: gymKeys.members() });
        await queryClient.invalidateQueries({ queryKey: gymKeys.memberDetail(variables.memberId) });
        await options.onSuccess?.(result, variables, onMutateResult, context);
      }
    });
  }

  function useCreateWorkout(
    options: Omit<UseMutationOptions<Workout, Error, WorkoutCreatePayload>, "mutationFn"> = {}
  ) {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: (payload: WorkoutCreatePayload) =>
        unwrapResult<Workout>(client.POST("/classes", { body: payload })),
      ...options,
      onSuccess: async (result, variables, onMutateResult, context) => {
        await queryClient.invalidateQueries({ queryKey: gymKeys.workouts() });
        await options.onSuccess?.(result, variables, onMutateResult, context);
      }
    });
  }

  function useUpdateWorkout(
    options: Omit<
      UseMutationOptions<Workout, Error, { workoutId: string; payload: WorkoutUpdatePayload }>,
      "mutationFn"
    > = {}
  ) {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: ({ workoutId, payload }) =>
        unwrapResult<Workout>(
          client.PATCH("/classes/{class_id}", {
            params: { path: { class_id: workoutId } },
            body: payload
          })
        ),
      ...options,
      onSuccess: async (result, variables, onMutateResult, context) => {
        await queryClient.invalidateQueries({ queryKey: gymKeys.workouts() });
        await queryClient.invalidateQueries({ queryKey: gymKeys.workoutDetail(variables.workoutId) });
        await options.onSuccess?.(result, variables, onMutateResult, context);
      }
    });
  }

  function useDeleteWorkout(
    options: Omit<UseMutationOptions<void, Error, { workoutId: string }>, "mutationFn"> = {}
  ) {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async ({ workoutId }) => {
        await unwrapResult(
          client.DELETE("/classes/{class_id}", { params: { path: { class_id: workoutId } } })
        );
      },
      ...options,
      onSuccess: async (result, variables, onMutateResult, context) => {
        await queryClient.invalidateQueries({ queryKey: gymKeys.workouts() });
        await options.onSuccess?.(result, variables, onMutateResult, context);
      }
    });
  }

  function useMarkAttendance(
    options: Omit<UseMutationOptions<AttendanceRecord, Error, AttendancePayload>, "mutationFn"> = {}
  ) {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: (payload: AttendancePayload) =>
        unwrapResult<AttendanceRecord>(client.POST("/attendance", { body: payload })),
      ...options,
      onSuccess: async (result, variables, onMutateResult, context) => {
        await queryClient.invalidateQueries({ queryKey: gymKeys.classAttendance(variables.class_id) });
        await queryClient.invalidateQueries({ queryKey: gymKeys.memberAttendance(variables.member_id) });
        await options.onSuccess?.(result, variables, onMutateResult, context);
      }
    });
  }

  function useCreatePlan(
    options: Omit<UseMutationOptions<Plan, Error, PlanCreatePayload>, "mutationFn"> = {}
  ) {
    const queryClient = useQueryClient();
    const untypedClient = client as any;

    return useMutation({
      mutationFn: (payload: PlanCreatePayload) =>
        unwrapResult<Plan>(untypedClient.POST("/plans", { body: payload })),
      ...options,
      onSuccess: async (result, variables, onMutateResult, context) => {
        await queryClient.invalidateQueries({ queryKey: gymKeys.plans() });
        await options.onSuccess?.(result, variables, onMutateResult, context);
      }
    });
  }

  function useUpdatePlan(
    options: Omit<
      UseMutationOptions<Plan, Error, { planId: string; payload: PlanUpdatePayload }>,
      "mutationFn"
    > = {}
  ) {
    const queryClient = useQueryClient();
    const untypedClient = client as any;

    return useMutation({
      mutationFn: ({ planId, payload }) =>
        unwrapResult<Plan>(
          untypedClient.PATCH("/plans/{plan_id}", {
            params: { path: { plan_id: planId } },
            body: payload
          })
        ),
      ...options,
      onSuccess: async (result, variables, onMutateResult, context) => {
        await queryClient.invalidateQueries({ queryKey: gymKeys.plans() });
        await options.onSuccess?.(result, variables, onMutateResult, context);
      }
    });
  }

  function useDeactivatePlan(
    options: Omit<UseMutationOptions<void, Error, { planId: string }>, "mutationFn"> = {}
  ) {
    const queryClient = useQueryClient();
    const untypedClient = client as any;

    return useMutation({
      mutationFn: async ({ planId }) => {
        await unwrapResult(
          untypedClient.DELETE("/plans/{plan_id}", {
            params: { path: { plan_id: planId } }
          })
        );
      },
      ...options,
      onSuccess: async (result, variables, onMutateResult, context) => {
        await queryClient.invalidateQueries({ queryKey: gymKeys.plans() });
        await options.onSuccess?.(result, variables, onMutateResult, context);
      }
    });
  }

  function useAssignSubscription(
    options: Omit<
      UseMutationOptions<
        MemberSubscription,
        Error,
        { memberId: string; payload: SubscriptionAssignPayload }
      >,
      "mutationFn"
    > = {}
  ) {
    const queryClient = useQueryClient();
    const untypedClient = client as any;

    return useMutation({
      mutationFn: ({ memberId, payload }) =>
        unwrapResult<MemberSubscription>(
          untypedClient.POST("/members/{member_id}/subscription", {
            params: { path: { member_id: memberId } },
            body: payload
          })
        ),
      ...options,
      onSuccess: async (result, variables, onMutateResult, context) => {
        await queryClient.invalidateQueries({
          queryKey: gymKeys.memberSubscription(variables.memberId)
        });
        await queryClient.invalidateQueries({ queryKey: gymKeys.memberDetail(variables.memberId) });
        await queryClient.invalidateQueries({ queryKey: gymKeys.dashboard(variables.memberId) });
        await queryClient.invalidateQueries({ queryKey: gymKeys.memberSelfSubscription() });
        await options.onSuccess?.(result, variables, onMutateResult, context);
      }
    });
  }

  function useAssignPlan(
    options: Omit<
      UseMutationOptions<
        MemberSubscription,
        Error,
        { memberId: string; payload: SubscriptionAssignPayload }
      >,
      "mutationFn"
    > = {}
  ) {
    const queryClient = useQueryClient();
    const untypedClient = client as any;

    return useMutation({
      mutationFn: ({ memberId, payload }) =>
        unwrapResult<MemberSubscription>(
          untypedClient.POST("/members/{member_id}/assign-plan", {
            params: { path: { member_id: memberId } },
            body: payload
          })
        ),
      ...options,
      onSuccess: async (result, variables, onMutateResult, context) => {
        await queryClient.invalidateQueries({
          queryKey: gymKeys.memberSubscription(variables.memberId)
        });
        await queryClient.invalidateQueries({ queryKey: gymKeys.memberDetail(variables.memberId) });
        await queryClient.invalidateQueries({ queryKey: gymKeys.dashboard(variables.memberId) });
        await queryClient.invalidateQueries({ queryKey: gymKeys.memberSelfSubscription() });
        await queryClient.invalidateQueries({ queryKey: gymKeys.members() });
        await options.onSuccess?.(result, variables, onMutateResult, context);
      }
    });
  }

  function useCancelSubscription(
    options: Omit<UseMutationOptions<void, Error, { memberId: string }>, "mutationFn"> = {}
  ) {
    const queryClient = useQueryClient();
    const untypedClient = client as any;

    return useMutation({
      mutationFn: async ({ memberId }) => {
        await unwrapResult(
          untypedClient.DELETE("/members/{member_id}/subscription", {
            params: { path: { member_id: memberId } }
          })
        );
      },
      ...options,
      onSuccess: async (result, variables, onMutateResult, context) => {
        await queryClient.invalidateQueries({
          queryKey: gymKeys.memberSubscription(variables.memberId)
        });
        await queryClient.invalidateQueries({ queryKey: gymKeys.memberDetail(variables.memberId) });
        await queryClient.invalidateQueries({ queryKey: gymKeys.dashboard(variables.memberId) });
        await queryClient.invalidateQueries({ queryKey: gymKeys.memberSelfSubscription() });
        await options.onSuccess?.(result, variables, onMutateResult, context);
      }
    });
  }

  function useAssignMemberToClass(
    options: Omit<
      UseMutationOptions<
        BookingAction,
        Error,
        { classId: string; payload: ClassAssignmentPayload; memberId: string }
      >,
      "mutationFn"
    > = {}
  ) {
    const queryClient = useQueryClient();
    const untypedClient = client as any;

    return useMutation({
      mutationFn: ({ classId, payload }) =>
        unwrapResult<BookingAction>(
          untypedClient.POST("/classes/{class_id}/assign-member", {
            params: { path: { class_id: classId } },
            body: payload
          })
        ),
      ...options,
      onSuccess: async (result, variables, onMutateResult, context) => {
        await queryClient.invalidateQueries({ queryKey: gymKeys.workouts() });
        await queryClient.invalidateQueries({ queryKey: gymKeys.workoutDetail(variables.classId) });
        await queryClient.invalidateQueries({ queryKey: gymKeys.classMembers(variables.classId) });
        await queryClient.invalidateQueries({ queryKey: gymKeys.memberBookings(variables.memberId) });
        await queryClient.invalidateQueries({ queryKey: gymKeys.memberSubscription(variables.memberId) });
        await queryClient.invalidateQueries({ queryKey: gymKeys.memberSelfSubscription() });
        await options.onSuccess?.(result, variables, onMutateResult, context);
      }
    });
  }

  return {
    useWorkouts,
    useWorkout,
    useMembers,
    useMember,
    useMemberBookings,
    useMemberSubscription,
    useMySubscriptionStatus,
    useMemberAttendance,
    useClassAttendance,
    useClassMembers,
    usePlans,
    useLogin,
    useGoogleLogin,
    useRegister,
    useCreateBooking,
    useCancelBooking,
    useCreateMember,
    useUpdateMember,
    useCreateWorkout,
    useUpdateWorkout,
    useDeleteWorkout,
    useMarkAttendance,
    useCreatePlan,
    useUpdatePlan,
    useDeactivatePlan,
    useAssignSubscription,
    useAssignPlan,
    useCancelSubscription,
    useAssignMemberToClass
  };
}
