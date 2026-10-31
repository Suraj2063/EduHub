/**
 * Validates password strength according to modern security standards:
 * - Length between 6 and 18 characters
 * - At least one uppercase letter (A-Z)
 * - At least one lowercase letter (a-z)
 * - At least one number (0-9)
 * - At least one special symbol (!@#$%^&*...)
 */
const validatePassword = (password) => {
  if (!password || typeof password !== "string") {
    return {
      isValid: false,
      message: "Password is required",
    };
  }

  if (password.length < 6 || password.length > 18) {
    return {
      isValid: false,
      message: "Password must be between 6 and 18 characters in length",
    };
  }

  if (!/[A-Z]/.test(password)) {
    return {
      isValid: false,
      message: "Password must contain at least one uppercase letter (A-Z)",
    };
  }

  if (!/[a-z]/.test(password)) {
    return {
      isValid: false,
      message: "Password must contain at least one lowercase letter (a-z)",
    };
  }

  if (!/[0-9]/.test(password)) {
    return {
      isValid: false,
      message: "Password must contain at least one number (0-9)",
    };
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) {
    return {
      isValid: false,
      message:
        "Password must contain at least one special character (e.g. !@#$%^&*)",
    };
  }

  return { isValid: true };
};

module.exports = {
  validatePassword,
};
