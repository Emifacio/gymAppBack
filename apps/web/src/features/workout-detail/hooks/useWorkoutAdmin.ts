import { useQueryClient } from "@tanstack/react-query";
import { gymKeys } from "@gym/api-client";
import { useAssignMemberToClass, useClassAttendance, useClassMembers, useDeleteWorkout, useUpdateWorkout } from "@/hooks/use-workouts";

export function useWorkoutAdmin(workoutId: string) {
  const queryClient = useQueryClient();

  const classMembersQuery = useClassMembers(workoutId);
  const classAttendanceQuery = useClassAttendance(workoutId);

  const assignMemberMutation = useAssignMemberToClass({
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: gymKeys.classMembers(workoutId) });
      await queryClient.invalidateQueries({ queryKey: gymKeys.classAttendance(workoutId) });
    }
  });

  const updateWorkoutMutation = useUpdateWorkout({
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: gymKeys.workoutDetail(workoutId) });
      await queryClient.invalidateQueries({ queryKey: gymKeys.workouts() });
    }
  });

  const deleteWorkoutMutation = useDeleteWorkout({
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: gymKeys.workouts() });
    }
  });

  return {
    classMembersQuery,
    classAttendanceQuery,
    assignMemberMutation,
    updateWorkoutMutation,
    deleteWorkoutMutation
  };
}
