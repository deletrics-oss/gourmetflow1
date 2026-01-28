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

// Helper function for API requests - supports both formats:
// apiRequest(method, url, body) - 3 arguments
// apiRequest(url, options) - 2 arguments (legacy)
export async function apiRequest(
    methodOrUrl: string,
    urlOrOptions?: string | RequestInit,
    body?: any
): Promise<any> {
    // In production (non-localhost), use relative path through Nginx proxy
    // In development (localhost), use direct connection to WhatsApp server
    const isProduction = typeof window !== 'undefined' && !window.location.hostname.includes('localhost');
    const baseUrl = isProduction
        ? '' // Use relative path - Nginx will proxy /api/ to the WhatsApp server
        : (import.meta.env.VITE_WHATSAPP_SERVER_URL || 'http://localhost:3088');

    let url: string;
    let options: RequestInit = {};

    // Detect which format is being used
    if (typeof urlOrOptions === 'string') {
        // 3-argument format: apiRequest(method, url, body)
        options.method = methodOrUrl;
        url = urlOrOptions;
        if (body !== undefined) {
            options.body = JSON.stringify(body);
        }
    } else {
        // 2-argument format: apiRequest(url, options)
        url = methodOrUrl;
        options = urlOrOptions || {};
    }

    const response = await fetch(`${baseUrl}${url}`, {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
        ...options,
    });

    if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText);
        throw new Error(errorText || `API Error: ${response.statusText}`);
    }

    return response.json();
}
