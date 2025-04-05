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
  
  // Create fetch options with proper credentials handling
  const options: RequestInit = {
    method,
    headers: {
      ...(data ? { "Content-Type": "application/json" } : {}),
      // Add cache control to prevent browser caching
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include", // Always include credentials
    cache: "no-store", // Prevent caching
    mode: "cors", // Enable CORS
  };
  
  // Make the fetch request
  try {
    const res = await fetch(url, options);
    
    console.log(`${method} response from ${url}:`, res.status, res.statusText);
    
    // Handle error responses
    if (!res.ok) {
      await throwIfResNotOk(res);
    }
    
    return res;
  } catch (error) {
    console.error(`Error in ${method} request to ${url}:`, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    console.log('Query fetch:', queryKey[0]);
    
    // Use the same options as apiRequest for consistency
    const options: RequestInit = {
      method: "GET",
      headers: {
        // Add cache control to prevent browser caching
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
      },
      credentials: "include", // Always include credentials
      cache: "no-store", // Prevent caching
      mode: "cors", // Enable CORS
    };
    
    try {
      const res = await fetch(queryKey[0] as string, options);
      
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
    } catch (error) {
      console.error(`Error in query to ${queryKey[0]}:`, error);
      throw error;
    }
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
