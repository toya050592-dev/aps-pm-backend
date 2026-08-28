export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Core API Request Handler
 * Karena App.jsx sudah memiliki global fetch interceptor (untuk auth & 401),
 * kita bisa langsung menggunakan window.fetch dengan aman di sini.
 */
async function request(endpoint, options = {}) {
    const url = `${API_URL}${endpoint}`;
    
    // Auto-detect dan format body (JSON vs FormData)
    if (options.body && !(options.body instanceof FormData) && typeof options.body === 'object') {
        options.body = JSON.stringify(options.body);
        options.headers = {
            ...options.headers,
            'Content-Type': 'application/json'
        };
    }

    const response = await fetch(url, options);
    
    // Parse response
    let data;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
        data = await response.json();
    } else {
        data = await response.text();
    }

    // Jika response gagal (4xx, 5xx), lempar error beserta format json-nya
    if (!response.ok) {
        const error = new Error(data.error || data.message || 'API Error');
        error.status = response.status;
        error.data = data;
        throw error;
    }

    return data;
}

export const api = {
    get: (endpoint) => request(endpoint, { method: 'GET' }),
    post: (endpoint, body) => request(endpoint, { method: 'POST', body }),
    put: (endpoint, body) => request(endpoint, { method: 'PUT', body }),
    delete: (endpoint, body) => request(endpoint, { method: 'DELETE', body })
};
