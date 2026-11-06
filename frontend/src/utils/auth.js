import axios from "axios";
import { API_URL } from "../config";

// Utility to get/set auth data in localStorage

export const getToken = () => localStorage.getItem("eduhub_token");

export const getUser = () => {
  const user = localStorage.getItem("eduhub_user");
  return user ? JSON.parse(user) : null;
};

export const setAuth = (token, user) => {
  localStorage.setItem("eduhub_token", token);
  localStorage.setItem("eduhub_user", JSON.stringify(user));
  window.dispatchEvent(new Event("authChange"));
};

export const clearAuth = () => {
  localStorage.removeItem("eduhub_token");
  localStorage.removeItem("eduhub_user");
  window.dispatchEvent(new Event("authChange"));
};

export const updateUser = (updatedFields) => {
  const current = getUser() || {};
  const merged = { ...current, ...updatedFields };
  localStorage.setItem("eduhub_user", JSON.stringify(merged));
  window.dispatchEvent(new Event("authChange"));
  return merged;
};

export const isLoggedIn = () => !!getToken();

/**
 * Revalidates the logged-in user against backend /api/users/me
 * Automatically synchronizes avatar, name, and bio to localStorage and UI.
 */
export const refreshUser = async () => {
  const token = getToken();
  if (!token) return null;

  try {
    const res = await axios.get(`${API_URL}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.data?.success && res.data?.result) {
      return updateUser(res.data.result);
    }
  } catch (err) {
    if (err.response?.status === 401) {
      clearAuth();
      return null;
    }
  }
  return getUser();
};

