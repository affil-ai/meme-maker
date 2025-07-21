## General Rules
- Never run the "dev" script unless asked to
- Always run "typecheck" and "lint" at the end of all your tasks that modify code
- Always use bun as your runtime
- The path alias is ~ not @
- Make sure to use the Context 7 MCP to view documentation on remotion: https://context7.com/remotion-dev/remotion/llms.txt


## React Query with tRPC in Client Components
- Always mark client components with `"use client";` at the top of the file
- Use the `useTRPC()` hook to access tRPC client in client components
- Use `useQuery` from `@tanstack/react-query` with tRPC query options for data fetching
- For mutations, use the tRPC mutation hooks
- Follow this pattern:
  ```tsx
  import { useTRPC } from "@repo/trpc/react";
  import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
  import { toast } from "sonner";

  // In client component
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery(
    trpc.resource.getResource.queryOptions({ id })
  );

  const mutation = useMutation(
    trpc.resource.updateResource.mutationOptions({
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: trpc.resource.getMany.queryKey()});
            toast.success("Successfully updated");
        },
        onError: () => {
            toast.error(error.message);
        }
    })
  );
  ```
- Handle loading and error states appropriately in the UI