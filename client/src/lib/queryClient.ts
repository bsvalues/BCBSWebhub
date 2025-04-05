import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    try {
      // Try to parse the error as JSON first
      const errorData = await res.json();
      throw new Error(errorData.error || `${res.status}: ${res.statusText}`);
    } catch (e) {
      // If JSON parsing fails, use text
      const text = await res.text() || res.statusText;
      throw new Error(`${res.status}: ${text}`);
    }
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  console.log(`Making ${method} request to ${url}`, data ? 'with data' : 'without data');
  
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  console.log(`${method} response from ${url}:`, res.status, res.statusText);
  
  if (!res.ok) {
    await throwIfResNotOk(res);
  }
  
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    console.log('Query fetch:', queryKey[0]);
    
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });
    
    console.log('Query response status:', res.status);

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      console.log('Handling 401 as null return');
      return null;
    }

    if (!res.ok) {
      await throwIfResNotOk(res);
    }
    
    const data = await res.json();
    console.log('Query response data:', data ? 'received' : 'empty');
    return data;
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes instead of Infinity to allow some refetching
      retry: 1, // Allow one retry
    },
    mutations: {
      retry: 1, // Allow one retry for mutations too
    },
  },
});
