import { API_URL, API_BASE_URL } from "../../config";
import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { setAuth } from "../../utils/auth";
import Logo from "../../components/Logo";
import { MailIcon, RocketIcon, ArrowRightIcon, ArrowLeftIcon } from "../../components/Icons";
import "./Register.css";

function Register() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    dob: "",
    age: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState("form"); // "form" | "otp"
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // 60-second countdown timer for resending OTP
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleDobChange = (e) => {
    const dobVal = e.target.value;
    let calculatedAge = "";
    if (dobVal) {
      const birthDate = new Date(dobVal);
      const today = new Date();
      let ageDiff = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        ageDiff--;
      }
      calculatedAge = ageDiff >= 0 ? ageDiff : "";
    }
    setFormData((prev) => ({
      ...prev,
      dob: dobVal,
      age: calculatedAge,
    }));
  };

  const password = formData.password;

  // Modern password strength criteria
  const isLengthValid = password.length >= 6 && password.length <= 18;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password);

  const criteriaCount = [
    isLengthValid,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecial,
  ].filter(Boolean).length;

  const isPasswordValid =
    isLengthValid && hasUppercase && hasLowercase && hasNumber && hasSpecial;

  // Strength score & label
  let strengthLabel = "";
  let strengthClass = "";
  let barsCount = 0;
  let barColorClass = "";

  if (password.length > 0) {
    if (criteriaCount <= 2) {
      strengthLabel = "Weak password";
      strengthClass = "weak";
      barsCount = 1;
      barColorClass = "bar-weak";
    } else if (criteriaCount === 3) {
      strengthLabel = "Fair";
      strengthClass = "fair";
      barsCount = 2;
      barColorClass = "bar-fair";
    } else if (criteriaCount === 4) {
      strengthLabel = "Good";
      strengthClass = "good";
      barsCount = 3;
      barColorClass = "bar-good";
    } else {
      strengthLabel = "Strong & Secure";
      strengthClass = "strong";
      barsCount = 4;
      barColorClass = "bar-strong";
    }
  }

  // Step 1: Submit details to trigger OTP verification email
  const handleFormSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.email.trim() || !formData.password) {
      toast.error("Please fill in all fields");
      return;
    }

    if (!isLengthValid) {
      toast.error("Password must be between 6 and 18 characters long");
      return;
    }

    if (!isPasswordValid) {
      toast.error(
        "Password must contain uppercase, lowercase, a number, and a special character"
      );
      return;
    }

    setLoading(true);
    try {
      const response = await axios({
        url: `${API_URL}/auth/register`,
        method: "post",
        data: {
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password,
          dob: formData.dob || undefined,
          age: formData.age ? Number(formData.age) : undefined,
        },
      });

      if (response.data.requireOtp) {
        setStep("otp");
        setCountdown(60);
        toast.success(response.data.message || "Verification code sent to your email!");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP and create account
  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    if (!otp.trim() || otp.trim().length !== 6) {
      toast.error("Please enter the 6-digit verification code");
      return;
    }

    setLoading(true);
    try {
      const response = await axios({
        url: `${API_URL}/auth/register`,
        method: "post",
        data: {
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password,
          otp: otp.trim(),
          dob: formData.dob || undefined,
          age: formData.age ? Number(formData.age) : undefined,
        },
      });

      if (response.data.success) {
        setAuth(response.data.result.token, response.data.result.user);
        window.dispatchEvent(new Event("authChange"));
        toast.success(response.data.message || "Account created! Welcome to EduHub");
        const redirectTo = location.state?.from || "/";
        navigate(redirectTo, { replace: true });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Invalid or expired code");
    } finally {
      setLoading(false);
    }
  };

  // Resend fresh OTP
  const handleResendOtp = async () => {
    if (countdown > 0 || resending) return;
    setResending(true);
    try {
      const response = await axios({
        url: `${API_URL}/auth/resend-otp`,
        method: "post",
        data: {
          email: formData.email.trim(),
          name: formData.name.trim(),
        },
      });
      if (response.data.success) {
        setCountdown(60);
        setOtp("");
        toast.success(response.data.message || "Fresh code sent to your email!");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to resend code");
    } finally {
      setResending(false);
    }
  };

  const handleBackToForm = () => {
    setStep("form");
    setOtp("");
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-brand-header">
          <Logo to="/" size={44} />
        </div>

        {step === "form" ? (
          <>
            {/* Header */}
            <div className="auth-header">
              <h1 className="auth-title">Create your account</h1>
              <p className="auth-subtitle">
                Join your college peer community to share and access study notes
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleFormSubmit} className="auth-form">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  id="register-name"
                  type="text"
                  name="name"
                  placeholder="Alex Johnson"
                  value={formData.name}
                  onChange={handleChange}
                  className="form-input"
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">College Email</label>
                <input
                  id="register-email"
                  type="email"
                  name="email"
                  placeholder="you@college.edu"
                  value={formData.email}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>

              {/* DOB & Age */}
              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="register-dob">Date of Birth</label>
                  <input
                    id="register-dob"
                    type="date"
                    name="dob"
                    max={new Date().toISOString().split("T")[0]}
                    value={formData.dob}
                    onChange={handleDobChange}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="register-age">Age</label>
                  <input
                    id="register-age"
                    type="number"
                    name="age"
                    placeholder="Auto-calculated"
                    min="1"
                    max="120"
                    value={formData.age}
                    onChange={handleChange}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="password-input-wrapper">
                  <input
                    id="register-password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    maxLength={18}
                    placeholder="6 to 18 characters"
                    value={formData.password}
                    onChange={handleChange}
                    className="form-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="password-toggle-btn"
                    title={showPassword ? "Hide password" : "Show password"}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg className="eye-icon-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg className="eye-icon-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>

                {/* Interactive Strength Meter Bar */}
                {password.length > 0 && (
                  <div className="strength-container">
                    <div className="strength-header-row">
                      <span className="strength-text-label">Strength:</span>
                      <span className={`strength-rating-text ${strengthClass}`}>
                        {strengthLabel}
                      </span>
                    </div>
                    <div className="strength-bars-row">
                      {[1, 2, 3, 4].map((barIndex) => (
                        <div
                          key={barIndex}
                          className={`strength-bar ${
                            barIndex <= barsCount ? barColorClass : ""
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Live Criteria Checklist */}
                <div className="criteria-checklist">
                  <div className={`criteria-item ${isLengthValid ? "met" : "unmet"}`}>
                    <span className="criteria-icon">{isLengthValid ? "✓" : "○"}</span>
                    <span>6 to 18 characters</span>
                  </div>
                  <div className={`criteria-item ${hasUppercase ? "met" : "unmet"}`}>
                    <span className="criteria-icon">{hasUppercase ? "✓" : "○"}</span>
                    <span>Uppercase (A-Z)</span>
                  </div>
                  <div className={`criteria-item ${hasLowercase ? "met" : "unmet"}`}>
                    <span className="criteria-icon">{hasLowercase ? "✓" : "○"}</span>
                    <span>Lowercase (a-z)</span>
                  </div>
                  <div className={`criteria-item ${hasNumber ? "met" : "unmet"}`}>
                    <span className="criteria-icon">{hasNumber ? "✓" : "○"}</span>
                    <span>Number (0-9)</span>
                  </div>
                  <div className={`criteria-item ${hasSpecial ? "met" : "unmet"}`}>
                    <span className="criteria-icon">{hasSpecial ? "✓" : "○"}</span>
                    <span>Special (!@#$...)</span>
                  </div>
                </div>
              </div>

              <button
                id="register-submit"
                type="submit"
                disabled={loading || (password.length > 0 && !isPasswordValid)}
                className="auth-submit-btn"
              >
                {loading ? (
                  <>
                    <div className="btn-spinner" />
                    <span>Verifying details...</span>
                  </>
                ) : (
                  <span className="btn-with-icon">
                    Verify Email & Continue <ArrowRightIcon size={16} />
                  </span>
                )}
              </button>
            </form>

            {/* Footer */}
            <p className="auth-footer">
              Already registered?{" "}
              <Link to="/login" className="auth-link">
                Sign in here
              </Link>
            </p>
          </>
        ) : (
          <>
            {/* Header */}
            <div className="auth-header">
              <h1 className="auth-title">Verify your email</h1>
              <p className="auth-subtitle">
                Enter the 6-digit code sent to verify your college account:
              </p>
            </div>

            {/* Target Email Card */}
            <div className="otp-target-card">
              <div className="otp-target-info">
                <span className="otp-target-icon">
                  <MailIcon size={18} />
                </span>
                <span className="otp-target-email" title={formData.email}>
                  {formData.email}
                </span>
              </div>
              <button
                type="button"
                onClick={handleBackToForm}
                className="otp-change-email-btn"
              >
                Edit
              </button>
            </div>

            {/* OTP Verification Form */}
            <form onSubmit={handleOtpSubmit} className="auth-form">
              <div className="form-group">
                <label className="form-label">Enter 6-Digit Code</label>
                <input
                  id="register-otp-input"
                  type="text"
                  maxLength={6}
                  placeholder="------"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  className="otp-input-field"
                  autoFocus
                />
              </div>

              <button
                id="register-otp-submit"
                type="submit"
                disabled={loading || otp.length !== 6}
                className="auth-submit-btn"
              >
                {loading ? (
                  <>
                    <div className="btn-spinner" />
                    <span>Creating account...</span>
                  </>
                ) : (
                  <span className="btn-with-icon">
                    Confirm & Create Account <RocketIcon size={18} />
                  </span>
                )}
              </button>
            </form>

            {/* Resend Countdown / Action */}
            <div className="otp-resend-container">
              {countdown > 0 ? (
                <span>
                  Resend code in{" "}
                  <strong className="otp-resend-timer">
                    0:{countdown < 10 ? `0${countdown}` : countdown}
                  </strong>
                </span>
              ) : (
                <span>
                  Didn't receive code?{" "}
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resending}
                    className="otp-resend-action-btn"
                  >
                    {resending ? "Sending..." : "Resend Code"}
                  </button>
                </span>
              )}
            </div>

            {/* Back link */}
            <p className="auth-footer">
              <button
                type="button"
                onClick={handleBackToForm}
                className="otp-back-action-btn"
              >
                <ArrowLeftIcon size={14} /> Back to Edit Details
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default Register;
