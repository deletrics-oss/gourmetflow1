import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5, // 5 minutes
            gcTime: 1000 * 60 * 30, // 30 minutes
            retry: 1,
            refetchOnWindowFocus: false,
        },
    },
});

// Helper function for API requests
export async function apiRequest(url: string, options: RequestInit = {}) {
    const baseUrl = import.meta.env.VITE_WHATSAPP_SERVER_URL || 'http://localhost:3088';

    const response = await fetch(`${baseUrl}${url}`, {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
        ...options,
    });

    if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
}
