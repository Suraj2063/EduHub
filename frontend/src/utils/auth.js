// Utility to get/set auth data in localStorage

export const getToken = () => localStorage.getItem("eduhub_token");

export const getUser = () => {
  const user = localStorage.getItem("eduhub_user");
  return user ? JSON.parse(user) : null;
};

export const setAuth = (token, user) => {
  localStorage.setItem("eduhub_token", token);
  localStorage.setItem("eduhub_user", JSON.stringify(user));
};

export const clearAuth = () => {
  localStorage.removeItem("eduhub_token");
  localStorage.removeItem("eduhub_user");
};

export const updateUser = (updatedFields) => {
  const current = getUser() || {};
  const merged = { ...current, ...updatedFields };
  localStorage.setItem("eduhub_user", JSON.stringify(merged));
  window.dispatchEvent(new Event("authChange"));
  return merged;
};

export const isLoggedIn = () => !!getToken();
