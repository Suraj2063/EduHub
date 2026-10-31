/**
 * Central API configuration for EduHub Frontend
 * In development (localhost): uses http://localhost:8000
 * In production (Docker/Nginx): uses relative path "" so Nginx proxies /api and /uploads
 */
export const API_BASE_URL = import.meta.env.VITE_API_URL !== undefined 
  ? import.meta.env.VITE_API_URL 
  : (import.meta.env.DEV ? "http://localhost:8000" : "");

export const API_URL = `${API_BASE_URL}/api`;
