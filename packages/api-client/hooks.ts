import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions
} from "@tanstack/react-query";

import { toAuthSession, type AuthSession, type SessionManager } from "./auth";
import {
  unwrapResult,
  type BookingAction,
  type BookingPayload,
  type GymApiClient,
  type LoginPayload,
  type MemberBookings,
  type RegisterPayload,
  type Workout,
  type WorkoutFilters
} from "./client";

export const gymKeys = {
  all: ["gym"] as const,
  workouts: () => [...gymKeys.all, "workouts"] as const,
  workoutList: (filters: WorkoutFilters = {}) => [...gymKeys.workouts(), "list", filters] as const,
  workoutDetail: (workoutId: string) => [...gymKeys.workouts(), "detail", workoutId] as const,
  memberBookings: (memberId: string) => [...gymKeys.all, "member-bookings", memberId] as const,
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
    queryFn: () => unwrapResult<Workout>(client.GET("/classes/{class_id}", { params: { path: { class_id: workoutId } } }))
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

export function createApiHooks({ client, sessionManager }: CreateApiHooksOptions) {
  function useWorkouts(filters: WorkoutFilters = {}) {
    return useQuery(getWorkoutsQueryOptions(client, filters));
  }

  function useWorkout(workoutId: string) {
    return useQuery(getWorkoutQueryOptions(client, workoutId));
  }

  function useMemberBookings(memberId: string) {
    return useQuery(getMemberBookingsQueryOptions(client, memberId));
  }

  function useLogin(
    options: Omit<
      UseMutationOptions<AuthSession, Error, LoginPayload>,
      "mutationFn"
    > = {}
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
    options: Omit<
      UseMutationOptions<AuthSession, Error, RegisterPayload>,
      "mutationFn"
    > = {}
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
    options: Omit<
      UseMutationOptions<BookingAction, Error, BookingPayload>,
      "mutationFn"
    > = {}
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

  return {
    useWorkouts,
    useWorkout,
    useMemberBookings,
    useLogin,
    useRegister,
    useCreateBooking
  };
}
