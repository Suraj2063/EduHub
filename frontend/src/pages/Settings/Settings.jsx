import { API_URL, API_BASE_URL } from "../../config";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { getToken, clearAuth, isLoggedIn, updateUser } from "../../utils/auth";
import "../Resources/UploadResource.css";
import "./Settings.css";

function Settings() {
  const [profileData, setProfileData] = useState({
    name: "",
    bio: "",
    avatar: "",
    dob: "",
    age: "",
    email: "",
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoggedIn()) {
      toast.error("Please login to access settings");
      navigate("/login");
      return;
    }

    const fetchUserProfile = async () => {
      try {
        const response = await axios({
          url: `${API_URL}/users/me`,
          method: "get",
          headers: { Authorization: `Bearer ${getToken()}` },
        });

        if (response.data.success) {
          const u = response.data.result;
          setProfileData({
            name: u.name || "",
            email: u.email || "",
            bio: u.bio || "",
            avatar: u.avatar || "",
            dob: u.dob ? new Date(u.dob).toISOString().split("T")[0] : "",
            age: u.age !== null && u.age !== undefined ? u.age : "",
          });
        }
      } catch (error) {
        if (error.response?.status === 401) {
          clearAuth();
          toast.error("Session expired, please login again", { toastId: "session-expired" });
          navigate("/login");
        } else {
          toast.error("Failed to load user profile", { toastId: "profile-error" });
        }
      }
    };

    fetchUserProfile();
  }, [navigate]);

  const handleProfileChange = (e) => {
    setProfileData({ ...profileData, [e.target.name]: e.target.value });
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
    setProfileData((prev) => ({
      ...prev,
      dob: dobVal,
      age: calculatedAge,
    }));
  };

  const handleAvatarFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file (JPEG, PNG, WebP)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Avatar size must be less than 5MB");
      return;
    }

    const formData = new FormData();
    formData.append("avatar", file);

    setUploadingAvatar(true);
    try {
      const response = await axios({
        url: `${API_URL}/users/me`,
        method: "patch",
        data: formData,
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data.success) {
        const updated = response.data.result;
        setProfileData((prev) => ({
          ...prev,
          avatar: updated.avatar,
        }));
        updateUser(updated);
        toast.success("Profile photo updated successfully!");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to upload profile picture");
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handlePasswordChange = (e) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  // Password validation & strength calculation
  const newPassword = passwordData.newPassword;
  const isLengthValid = newPassword.length >= 6 && newPassword.length <= 18;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(newPassword);

  const criteriaCount = [
    isLengthValid,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecial,
  ].filter(Boolean).length;

  const isPasswordValid =
    isLengthValid && hasUppercase && hasLowercase && hasNumber && hasSpecial;

  let strengthLabel = "";
  let strengthClass = "";
  let barsCount = 0;
  let barColorClass = "";

  if (newPassword.length > 0) {
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

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!profileData.name.trim()) {
      toast.error("Name is required");
      return;
    }

    setLoadingProfile(true);
    try {
      const response = await axios({
        url: `${API_URL}/users/me`,
        method: "patch",
        data: {
          name: profileData.name.trim(),
          bio: profileData.bio,
          dob: profileData.dob || null,
          age: profileData.age ? Number(profileData.age) : null,
        },
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      if (response.data.success) {
        updateUser(response.data.result);
        toast.success("Profile updated successfully!");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update profile");
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!passwordData.currentPassword || !passwordData.newPassword) {
      toast.error("Please fill in both current and new passwords");
      return;
    }

    if (!isLengthValid) {
      toast.error("New password must be between 6 and 18 characters");
      return;
    }

    if (!isPasswordValid) {
      toast.error(
        "New password must contain uppercase, lowercase, a number, and a special character"
      );
      return;
    }

    setLoadingPassword(true);
    try {
      const response = await axios({
        url: `${API_URL}/users/change-password`,
        method: "patch",
        data: passwordData,
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      if (response.data.success) {
        toast.success("Password changed successfully!");
        setPasswordData({ currentPassword: "", newPassword: "" });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to change password");
    } finally {
      setLoadingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmation = window.prompt(
      "Type 'DELETE' to confirm permanent account deletion:"
    );
    if (confirmation !== "DELETE") {
      if (confirmation !== null) toast.error("Account deletion cancelled");
      return;
    }

    setLoadingDelete(true);
    try {
      const response = await axios({
        url: `${API_URL}/users/me/delete`,
        method: "delete",
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      if (response.data.success) {
        clearAuth();
        window.dispatchEvent(new Event("authChange"));
        toast.success("Account deleted. We hope to see you back!");
        navigate("/");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete account");
    } finally {
      setLoadingDelete(false);
    }
  };

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h1 className="settings-main-title">Account Settings</h1>
        <p className="settings-main-subtitle">
          Manage your personal details, credentials, and profile preferences
        </p>
      </div>

      <div>
        {/* Profile Details Card */}
        <div className="settings-card">
          <h2 className="settings-card-title">Public Profile</h2>
          <p className="settings-card-desc">
            This information and profile photo is displayed across EduHub.
          </p>

          {/* Profile Picture Upload Section */}
          <div className="settings-avatar-section">
            <div
              className={`settings-avatar-wrapper ${uploadingAvatar ? "uploading" : ""}`}
              onClick={() => !uploadingAvatar && fileInputRef.current?.click()}
              title="Click to upload profile photo"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  fileInputRef.current?.click();
                }
              }}
            >
              {profileData.avatar ? (
                <img
                  src={profileData.avatar}
                  alt={profileData.name}
                  className="settings-avatar-img"
                />
              ) : (
                <div className="settings-avatar-placeholder">
                  {profileData.name?.charAt(0).toUpperCase() || "U"}
                </div>
              )}

              {/* Hover Camera Overlay */}
              <div className="settings-avatar-overlay">
                <svg
                  className="settings-camera-icon"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span className="settings-avatar-overlay-text">
                  {uploadingAvatar ? "Uploading..." : "Change"}
                </span>
              </div>
            </div>

            <div className="settings-avatar-info">
              <h3 className="settings-avatar-user-name">
                {profileData.name || "Student User"}
              </h3>
              <p className="settings-avatar-user-email">{profileData.email}</p>
              <p className="settings-avatar-hint">
                Click your avatar to upload a new photo. Formats: JPEG, PNG, WebP (max 5 MB). Stored securely on Cloudinary.
              </p>
              <button
                type="button"
                className="btn-upload-avatar-trigger"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
              >
                {uploadingAvatar ? "Uploading to Cloudinary..." : "Choose New Photo"}
              </button>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleAvatarFileSelect}
              style={{ display: "none" }}
            />
          </div>

          <form onSubmit={handleUpdateProfile} className="resource-form">
            <div className="form-field-group">
              <label className="field-label">Display Name</label>
              <input
                id="settings-name"
                type="text"
                name="name"
                placeholder="Enter your full name"
                value={profileData.name}
                onChange={handleProfileChange}
                className="field-input"
              />
            </div>

            {/* DOB & Age Row */}
            <div className="settings-form-grid-2">
              <div className="form-field-group">
                <label className="field-label" htmlFor="settings-dob">Date of Birth</label>
                <input
                  id="settings-dob"
                  type="date"
                  name="dob"
                  max={new Date().toISOString().split("T")[0]}
                  value={profileData.dob}
                  onChange={handleDobChange}
                  className="field-input"
                />
              </div>

              <div className="form-field-group">
                <label className="field-label" htmlFor="settings-age">Age</label>
                <input
                  id="settings-age"
                  type="number"
                  name="age"
                  placeholder="Auto-calculated from DOB"
                  min="1"
                  max="120"
                  value={profileData.age}
                  onChange={handleProfileChange}
                  className="field-input"
                />
              </div>
            </div>

            <div className="form-field-group">
              <label className="field-label">Bio / Academic Background</label>
              <textarea
                id="settings-bio"
                name="bio"
                rows={3}
                placeholder="e.g. Sophomore Computer Science Major | Passionate about algorithms and web dev"
                value={profileData.bio}
                onChange={handleProfileChange}
                className="field-textarea"
              />
            </div>

            <div className="settings-form-row-right">
              <button
                id="settings-update-profile"
                type="submit"
                disabled={loadingProfile}
                className="btn-settings-save"
              >
                {loadingProfile ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </form>
        </div>

        {/* Change Password Card */}
        <div className="settings-card">
          <h2 className="settings-card-title">Change Password</h2>
          <p className="settings-card-desc">
            Keep your account secure with a strong password following standard security rules.
          </p>

          <form onSubmit={handleChangePassword} className="resource-form">
            {/* Current Password Field */}
            <div className="form-field-group">
              <label className="field-label">Current Password</label>
              <div className="settings-password-input-wrapper">
                <input
                  id="settings-current-password"
                  type={showCurrentPassword ? "text" : "password"}
                  name="currentPassword"
                  placeholder="Enter your current password"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  className="field-input"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="settings-password-toggle-btn"
                  title={showCurrentPassword ? "Hide password" : "Show password"}
                  aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                >
                  {showCurrentPassword ? (
                    <svg className="eye-icon-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="eye-icon-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* New Password Field */}
            <div className="form-field-group">
              <label className="field-label">New Password</label>
              <div className="settings-password-input-wrapper">
                <input
                  id="settings-new-password"
                  type={showNewPassword ? "text" : "password"}
                  name="newPassword"
                  maxLength={18}
                  placeholder="Enter 6-18 character new password"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  className="field-input"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="settings-password-toggle-btn"
                  title={showNewPassword ? "Hide password" : "Show password"}
                  aria-label={showNewPassword ? "Hide password" : "Show password"}
                >
                  {showNewPassword ? (
                    <svg className="eye-icon-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="eye-icon-svg" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Password Strength Meter */}
              {newPassword.length > 0 && (
                <div className="strength-container" style={{ marginTop: "10px" }}>
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
              <div className="criteria-checklist" style={{ marginTop: "12px" }}>
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
                  <span>Special character (!@#$...)</span>
                </div>
              </div>
            </div>

            <div className="settings-form-row-right">
              <button
                id="settings-change-password"
                type="submit"
                disabled={loadingPassword}
                className="btn-settings-save"
              >
                {loadingPassword ? "Updating..." : "Update Password"}
              </button>
            </div>
          </form>
        </div>

        {/* Danger Zone Card */}
        <div className="settings-card settings-danger-card">
          <h2 className="settings-card-title danger-title">Danger Zone</h2>
          <p className="settings-card-desc">
            Irreversible account actions. Please proceed with caution.
          </p>

          <div className="danger-action-row">
            <div>
              <p className="danger-text-title">Delete Account</p>
              <p className="danger-text-desc">
                Permanently delete your student profile and access credentials.
              </p>
            </div>

            <button
              id="settings-delete-account"
              onClick={handleDeleteAccount}
              disabled={loadingDelete}
              className="btn-danger-confirm"
            >
              {loadingDelete ? "Deleting..." : "Delete Account"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
