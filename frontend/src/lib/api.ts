import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';

// Track if backend is available
let backendAvailable: boolean | null = null;
let lastCheck = 0;
const CHECK_INTERVAL = 30000; // Re-check every 30 seconds

export const isBackendAvailable = () => backendAvailable === true;
export const isDemoMode = () => {
  if (typeof window === 'undefined') return true;
  const token = localStorage.getItem('maki_token');
  return token === 'demo-token-makicore' || backendAvailable === false;
};

const api: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  timeout: 8000, // Reasonable timeout for real backend
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - attach auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('maki_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      const branchId = localStorage.getItem('maki_branch_id');
      if (branchId && config.headers) {
        config.headers['X-Branch-Id'] = branchId;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - unwrap {success, data} and handle errors
api.interceptors.response.use(
  (response) => {
    // Backend responded! Mark as available
    if (backendAvailable !== true) {
      backendAvailable = true;
    }
    // Unwrap the backend's {success, data} wrapper so stores get data directly
    if (response.data && typeof response.data === 'object' && 'success' in response.data && 'data' in response.data) {
      response.data = response.data.data;
    }
    return response;
  },
  (error: AxiosError<{ message?: string; statusCode?: number }>) => {
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.message || 'Error del servidor';

      switch (status) {
        case 401:
          // Don't redirect if: demo mode, already on login page, or no token (post-logout)
          if (!isDemoMode()) {
            if (typeof window !== 'undefined') {
              const currentPath = window.location.pathname;
              const hasToken = !!localStorage.getItem('maki_token');
              // Only redirect if we have a token (meaning session expired, not post-logout)
              // and we're not already on the login page
              if (hasToken && currentPath !== '/login') {
                localStorage.removeItem('maki_token');
                localStorage.removeItem('maki_user');
                window.location.href = '/login';
                toast.error('Sesion expirada. Inicia sesion nuevamente.');
              }
              // If no token or already on login, just silently reject — no redirect
            }
          }
          break;
        case 403:
          if (!isDemoMode()) toast.error('No tienes permisos para esta accion.');
          break;
        case 404:
          break;
        case 422:
          toast.error(message);
          break;
        case 429:
          toast.error('Demasiadas solicitudes. Espera un momento.');
          break;
        case 500:
          if (!isDemoMode()) toast.error('Error interno del servidor.');
          break;
        default:
          if (status >= 400 && !isDemoMode()) {
            toast.error(message);
          }
      }
    } else if (error.request) {
      // No response from server - backend offline
      const now = Date.now();
      if (backendAvailable !== false) {
        backendAvailable = false;
      }
      // Only show toast once every CHECK_INTERVAL, not every single request
      if (now - lastCheck > CHECK_INTERVAL) {
        lastCheck = now;
        // Don't spam - just log silently
        console.log('[MakiCore] Backend no disponible - modo demo activo');
      }
    }

    return Promise.reject(error);
  }
);

// ============================================================
// Normalize backend data → frontend types
// Backend uses: tax, item.subtotal, item.product.name
// Frontend uses: taxAmount, item.totalPrice, item.name
// ============================================================
// eslint-disable-next-line
export function normalizeOrderItem(item: any): any {
  if (!item || typeof item !== 'object') return item;
  return {
    ...item,
    name: item.name || item.product?.name || `Producto`,
    totalPrice: item.totalPrice ?? item.subtotal ?? (item.unitPrice || 0) * (item.quantity || 1),
    courseType: item.courseType || item.product?.courseType || item.station || 'PLATO_FUERTE',
    sortOrder: item.sortOrder ?? 0,
  };
}

// eslint-disable-next-line
export function normalizeOrder(order: any): any {
  if (!order || typeof order !== 'object') return order;
  // Only normalize if it looks like a backend order (has 'tax' instead of 'taxAmount')
  const items = Array.isArray(order.items) ? order.items.map(normalizeOrderItem) : order.items;
  return {
    ...order,
    items,
    taxAmount: order.taxAmount ?? order.tax ?? 0,
    tipAmount: order.tipAmount ?? 0,
    discountAmount: order.discountAmount ?? 0,
  };
}

// eslint-disable-next-line
export function normalizeOrders(data: any): any {
  if (Array.isArray(data)) return data.map(normalizeOrder);
  return data;
}

export default api;

// Typed API helpers
export const apiGet = <T>(url: string, params?: Record<string, unknown>) =>
  api.get<T>(url, { params }).then((res) => res.data);

export const apiPost = <T>(url: string, data?: unknown) =>
  api.post<T>(url, data).then((res) => res.data);

export const apiPut = <T>(url: string, data?: unknown) =>
  api.put<T>(url, data).then((res) => res.data);

export const apiPatch = <T>(url: string, data?: unknown) =>
  api.patch<T>(url, data).then((res) => res.data);

export const apiDelete = <T>(url: string) =>
  api.delete<T>(url).then((res) => res.data);
