import { queryOptions, useMutation, useQuery, useQueryClient, type UseMutationOptions } from "@tanstack/react-query";

import { toAuthSession, type AuthSession, type SessionManager } from "./auth";
import {
  unwrapResult,
  type ActivityRecord,
  type ActivitySyncPayload,
  type ActivitySyncResult,
  type AttendancePayload,
  type AttendanceRecord,
  type BookingAction,
  type BookingCancellation,
  type BookingPayload,
  type GymApiClient,
  type HealthStatus,
  type IntegrationAccount,
  type IntegrationConnectPayload,
  type LoginPayload,
  type Member,
  type MemberBookings,
  type MemberCreatePayload,
  type MemberFilters,
  type MemberUpdatePayload,
  type RegisterPayload,
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
  memberAttendance: (memberId: string) => [...gymKeys.all, "member-attendance", memberId] as const,
  classAttendance: (classId: string) => [...gymKeys.all, "class-attendance", classId] as const,
  memberActivities: (memberId: string) => [...gymKeys.all, "member-activities", memberId] as const,
  health: () => [...gymKeys.all, "health"] as const,
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
  return queryOptions({
    queryKey: gymKeys.memberBookings(memberId),
    queryFn: () =>
      unwrapResult<MemberBookings>(
        client.GET("/members/{member_id}/bookings", { params: { path: { member_id: memberId } } })
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

export function getMemberActivitiesQueryOptions(client: GymApiClient, memberId: string) {
  return queryOptions({
    queryKey: gymKeys.memberActivities(memberId),
    queryFn: () =>
      unwrapResult<ActivityRecord[]>(
        client.GET("/members/{member_id}/activities", { params: { path: { member_id: memberId } } })
      )
  });
}

export function getHealthQueryOptions(client: GymApiClient) {
  return queryOptions({
    queryKey: gymKeys.health(),
    queryFn: () => unwrapResult<HealthStatus>(client.GET("/health"))
  });
}

export function createApiHooks({ client, sessionManager }: CreateApiHooksOptions) {
  function useWorkouts(filters: WorkoutFilters = {}) {
    return useQuery(getWorkoutsQueryOptions(client, filters));
  }

  function useWorkout(workoutId: string) {
    return useQuery(getWorkoutQueryOptions(client, workoutId));
  }

  function useMembers(filters: MemberFilters = {}) {
    return useQuery(getMembersQueryOptions(client, filters));
  }

  function useMember(memberId: string) {
    return useQuery(getMemberQueryOptions(client, memberId));
  }

  function useMemberBookings(memberId: string) {
    return useQuery(getMemberBookingsQueryOptions(client, memberId));
  }

  function useMemberAttendance(memberId: string) {
    return useQuery(getMemberAttendanceQueryOptions(client, memberId));
  }

  function useClassAttendance(classId: string) {
    return useQuery(getClassAttendanceQueryOptions(client, classId));
  }

  function useMemberActivities(memberId: string) {
    return useQuery(getMemberActivitiesQueryOptions(client, memberId));
  }

  function useHealth() {
    return useQuery(getHealthQueryOptions(client));
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
        await options.onSuccess?.(session, variables, onMutateResult, context);
      }
    });
  }

  function useCreateBooking(
    options: Omit<UseMutationOptions<BookingAction, Error, BookingPayload>, "mutationFn"> = {}
  ) {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: (payload: BookingPayload) =>
        unwrapResult<BookingAction>(client.POST("/bookings", { body: payload })),
      ...options,
      onSuccess: async (result, variables, onMutateResult, context) => {
        await queryClient.invalidateQueries({ queryKey: gymKeys.workouts() });

        if (variables.member_id) {
          await queryClient.invalidateQueries({
            queryKey: gymKeys.memberBookings(variables.member_id)
          });
        }

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
          client.DELETE("/bookings/{booking_id}", { params: { path: { booking_id: bookingId } } })
        ),
      ...options,
      onSuccess: async (result, variables, onMutateResult, context) => {
        await queryClient.invalidateQueries({ queryKey: gymKeys.workouts() });
        await queryClient.invalidateQueries({ queryKey: gymKeys.memberBookings(variables.memberId) });
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

  function useConnectStrava(
    options: Omit<UseMutationOptions<IntegrationAccount, Error, IntegrationConnectPayload>, "mutationFn"> = {}
  ) {
    return useMutation({
      mutationFn: (payload: IntegrationConnectPayload) =>
        unwrapResult<IntegrationAccount>(client.POST("/integrations/strava/connect", { body: payload })),
      ...options
    });
  }

  function useSyncActivities(
    options: Omit<UseMutationOptions<ActivitySyncResult, Error, { memberId?: string }>, "mutationFn"> = {}
  ) {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: ({ memberId }) =>
        unwrapResult<ActivitySyncResult>(
          client.POST("/activities/sync", { body: { member_id: memberId ?? null } as ActivitySyncPayload })
        ),
      ...options,
      onSuccess: async (result, variables, onMutateResult, context) => {
        if (variables.memberId) {
          await queryClient.invalidateQueries({ queryKey: gymKeys.memberActivities(variables.memberId) });
        }
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
    useMemberAttendance,
    useClassAttendance,
    useMemberActivities,
    useHealth,
    useLogin,
    useRegister,
    useCreateBooking,
    useCancelBooking,
    useCreateMember,
    useUpdateMember,
    useCreateWorkout,
    useUpdateWorkout,
    useDeleteWorkout,
    useMarkAttendance,
    useConnectStrava,
    useSyncActivities
  };
}
