const nodemailer = require("nodemailer");

/**
 * Creates Nodemailer Gmail transporter using EMAIL_USER and EMAIL_PASS
 */
const getTransporter = () => {
  const user = process.env.EMAIL_USER ? process.env.EMAIL_USER.trim() : "";
  const pass = process.env.EMAIL_PASS ? process.env.EMAIL_PASS.replace(/\s+/g, "") : ""; // removes spaces if copied with spaces

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user,
      pass,
    },
  });
};

/**
 * Sends a responsive HTML verification OTP email using Gmail (Nodemailer)
 */
const sendOtpEmail = async (toEmail, otp, recipientName = "Student") => {
  // Always log OTP in terminal for immediate testing convenience
  console.log(`\n========================================`);
  console.log(`[EduHub OTP] For: ${toEmail}`);
  console.log(`[EduHub OTP] Verification Code: ${otp}`);
  console.log(`[EduHub OTP] Valid for: 5 minutes`);
  console.log(`========================================\n`);

  const transporter = getTransporter();

  if (!transporter) {
    console.warn("[EduHub] WARNING: EMAIL_USER or EMAIL_PASS not configured in backend/.env");
    return {
      success: false,
      message: "Gmail credentials not configured in backend/.env",
    };
  }

  const user = process.env.EMAIL_USER.trim();

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>EduHub Email Verification Code</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 40px 16px;">
          <tr>
            <td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; background-color: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.04);">
                <!-- Header -->
                <tr>
                  <td style="padding: 36px 36px 20px 36px; text-align: center; background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%); border-bottom: 1px solid #f1f5f9;">
                    <div style="display: inline-flex; align-items: center; gap: 10px; justify-content: center;">
                      <div style="width: 42px; height: 42px; border-radius: 11px; background: linear-gradient(135deg, #6366f1, #4338ca); display: inline-flex; align-items: center; justify-content: center;">
                        <svg width="26" height="26" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M24 11L10 18.5L24 26L38 18.5L24 11Z" fill="#ffffff" fill-opacity="0.98"/>
                          <path d="M15.5 22V29C15.5 32.5 19.2 35 24 35C28.8 35 32.5 32.5 32.5 29V22L24 26.5L15.5 22Z" fill="#c7d2fe"/>
                          <line x1="36" y1="20" x2="36" y2="29" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
                          <circle cx="36" cy="30.5" r="2" fill="#fbbf24"/>
                        </svg>
                      </div>
                      <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.02em;">Edu<span style="color: #4f46e5;">Hub</span></h1>
                    </div>
                    <p style="margin: 0; font-size: 13px; color: #64748b; font-weight: 500;">Centralized College Study Resource Hub</p>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 32px 36px;">
                    <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 700; color: #0f172a;">
                      Hello ${recipientName || "Student"},
                    </h2>
                    <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                      Thank you for joining EduHub! To verify your college email and activate your student account, please enter the one-time verification code below:
                    </p>

                    <!-- OTP Box -->
                    <div style="text-align: center; margin: 28px 0; padding: 22px; background-color: #eef2ff; border: 1.5px dashed #c7d2fe; border-radius: 14px;">
                      <span style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; color: #4338ca; letter-spacing: 10px; display: inline-block;">
                        ${otp}
                      </span>
                    </div>

                    <p style="margin: 0 0 16px 0; font-size: 13px; line-height: 1.5; color: #64748b; text-align: center;">
                      This code is valid for <strong>5 minutes</strong>.
                    </p>
                    <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #94a3b8; text-align: center;">
                      If you did not attempt to register on EduHub, you can safely ignore this email.
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 20px 36px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center;">
                    <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                      © ${new Date().getFullYear()} EduHub Platform • Built for College Students
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"EduHub Support" <${user}>`,
      to: toEmail,
      subject: `Your EduHub Verification Code: ${otp}`,
      html: htmlContent,
    });

    console.log("[EduHub] Email sent via Gmail. MessageId:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error("[EduHub] Gmail sending error:", err.message);
    return { success: false, message: err.message };
  }
};

module.exports = {
  sendOtpEmail,
};
