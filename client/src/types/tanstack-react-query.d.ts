declare module "@tanstack/react-query" {
  export class QueryClient {
    constructor(options?: any);
  }
  export const QueryClientProvider: any;
  export type QueryFunction<T = any> = (context: { queryKey: any[] }) => Promise<T>;
  export function useQuery<T = any>(options: { queryKey: any[]; queryFn?: any; enabled?: boolean; retry?: boolean | number; staleTime?: number }): {
    data: T | undefined;
    isLoading: boolean;
    isError: boolean;
    error: any;
    refetch: () => void;
  };
  export function useMutation<TData = any, TVariables = any>(options: {
    mutationFn: (variables: TVariables) => Promise<TData>;
    onSuccess?: (data: TData) => void;
    onError?: (error: any) => void;
  }): {
    mutate: (variables: TVariables) => void;
    mutateAsync: (variables: TVariables) => Promise<TData>;
    isPending: boolean;
    isLoading: boolean;
    error: any;
  };
  export function useQueryClient(): QueryClient & {
    clear: () => void;
    invalidateQueries: (options?: { queryKey?: any[] }) => Promise<void>;
  };
}

