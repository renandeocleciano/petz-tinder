import { useMutation, useQueryClient } from '@tanstack/react-query';

import { api, queryKeys, type ReportInput } from '@/lib/api';

export const useReportPet = () =>
  useMutation({ mutationFn: (input: ReportInput) => api.reportPet(input) });

export const useBlockPet = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (petId: string) => api.blockPet(petId),
    onSuccess: () =>
      Promise.all(
        [
          queryKeys.discoverRoot,
          queryKeys.matchesRoot,
          queryKeys.conversationsRoot,
          queryKeys.nearbyRoot,
        ].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      ),
  });
};
