import { Resend } from "resend";

type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
};

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    console.warn("Missing RESEND_API_KEY or EMAIL_FROM. Email sending skipped.");
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
    });

    if (result.error) {
      console.error("Resend API error:", result.error);
      return;
    }

    if (result.data) {
      console.log("Email sent successfully:", result.data.id);
    }
  } catch (err) {
    console.error("Resend email exception:", err);
  }
}

// Global styles for email templates
const containerStyle = "font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px;";
const buttonStyle = "display: inline-block; padding: 10px 20px; margin: 20px 0; background-color: #0ea5e9; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold;";
const cardStyle = "background-color: #f9fafb; padding: 15px; border-radius: 8px; margin-top: 15px; border: 1px solid #e5e7eb;";

const getAppUrl = () => process.env.APP_URL || "http://localhost:3000";

// --- Email Templates ---

export async function sendWelcomeEmail(user: { email: string; username: string }) {
  const html = `
    <div style="${containerStyle}">
      <h2>Welcome to Card Hive, ${user.username}! 🎉</h2>
      <p>We're excited to have you on board. Card Hive is the premier platform to securely trade your gift cards for instant cash.</p>
      <p>Whether you have iTunes, Amazon, Steam, or other cards, we offer competitive rates and fast payouts.</p>
      <a href="${getAppUrl()}/user" style="${buttonStyle}">Go to your Dashboard</a>
      <p>If you have any questions, our support team is always here to help.</p>
      <p>Best regards,<br/>The Card Hive Team</p>
    </div>
  `;
  return sendEmail({ to: user.email, subject: "Welcome to Card Hive", html });
}

export async function sendOTPEmail(email: string, otp: string) {
  const html = `
    <div style="${containerStyle}">
      <h2>Your Card Hive Verification Code</h2>
      <p>Please use the following 6-digit code to complete your registration:</p>
      <div style="${cardStyle}; text-align: center;">
        <h1 style="letter-spacing: 5px; color: #0ea5e9; font-size: 32px; margin: 0;">${otp}</h1>
      </div>
      <p>This code will expire in 10 minutes. If you did not request this code, you can safely ignore this email.</p>
      <p>Best regards,<br/>The Card Hive Team</p>
    </div>
  `;
  return sendEmail({ to: email, subject: "Your Verification Code - Card Hive", html });
}

export async function sendPasswordResetOTPEmail(email: string, otp: string) {
  const html = `
    <div style="${containerStyle}">
      <h2>Reset your Card Hive password</h2>
      <p>Please use the following 6-digit code to reset your account password:</p>
      <div style="${cardStyle}; text-align: center;">
        <h1 style="letter-spacing: 5px; color: #2563eb; font-size: 32px; margin: 0;">${otp}</h1>
      </div>
      <p>This code will expire in 10 minutes. If you did not request a password reset, you can safely ignore this email.</p>
      <p>Best regards,<br/>The Card Hive Team</p>
    </div>
  `;
  return sendEmail({ to: email, subject: "Reset your Password - Card Hive", html });
}

export async function sendPasswordResetEmail(user: { email: string }, token: string) {
  const resetUrl = `${getAppUrl()}/reset-password?token=${token}`;
  const html = `
    <div style="${containerStyle}">
      <h2>Reset your Card Hive password</h2>
      <p>We received a request to reset the password for your account.</p>
      <a href="${resetUrl}" style="${buttonStyle}">Reset Password</a>
      <p>This link will expire in 1 hour. If you did not request a password reset, you can safely ignore this email.</p>
    </div>
  `;
  return sendEmail({ to: user.email, subject: "Reset your Card Hive password", html });
}

export async function sendTradeSubmittedEmail(user: { email: string; username: string }, trade: any) {
  const html = `
    <div style="${containerStyle}">
      <h2>We received your trade ${trade.tradeId}</h2>
      <p>Hello ${user.username},</p>
      <p>Thank you for submitting your gift card. Our team will review it shortly. Here are the details of your submission:</p>
      <div style="${cardStyle}">
        <strong>Trade ID:</strong> ${trade.tradeId}<br/>
        <strong>Card Brand:</strong> ${trade.cardBrand}<br/>
        <strong>Value:</strong> ${trade.faceValue} ${trade.currency}<br/>
        <strong>Status:</strong> Pending
      </div>
      <a href="${getAppUrl()}/user/trades" style="${buttonStyle}">View Trade in Dashboard</a>
    </div>
  `;
  return sendEmail({ to: user.email, subject: `We received your trade ${trade.tradeId}`, html });
}

export async function sendTradeStatusUpdateEmail(user: { email: string; username: string }, trade: any, oldStatus: string, newStatus: string) {
  let subject = `Your trade ${trade.tradeId} status has been updated`;
  if (newStatus === "UNDER_REVIEW") subject = `Your trade ${trade.tradeId} is now Under Review`;
  if (newStatus === "APPROVED") subject = `Your trade ${trade.tradeId} has been Approved`;
  if (newStatus === "REJECTED") subject = `Your trade ${trade.tradeId} has been Rejected`;
  if (newStatus === "PAID") subject = `Your trade ${trade.tradeId} has been Marked as Paid`;

  let notesHtml = "";
  if (newStatus === "REJECTED" && trade.adminNotes) {
    notesHtml = `<p style="color: #ef4444; font-weight: bold; margin-top: 10px;">Reason: ${trade.adminNotes}</p>`;
  }

  const html = `
    <div style="${containerStyle}">
      <h2>Trade Status Update</h2>
      <p>Hello ${user.username},</p>
      <p>The status of your trade <strong>${trade.tradeId}</strong> has changed from <em>${oldStatus.replace("_", " ")}</em> to <strong>${newStatus.replace("_", " ")}</strong>.</p>
      
      <div style="${cardStyle}">
        <strong>Trade ID:</strong> ${trade.tradeId}<br/>
        <strong>Card Brand:</strong> ${trade.cardBrand}<br/>
        <strong>Value:</strong> ${trade.faceValue} ${trade.currency}
        ${notesHtml}
      </div>
      <a href="${getAppUrl()}/user/trades" style="${buttonStyle}">View Trade Details</a>
    </div>
  `;
  return sendEmail({ to: user.email, subject, html });
}

export async function sendPaymentSentEmail(user: { email: string; username: string }, trade: any) {
  const html = `
    <div style="${containerStyle}">
      <h2>Payment sent for trade ${trade.tradeId} 💸</h2>
      <p>Hello ${user.username},</p>
      <p>Great news! Payment for your recent gift card trade has been processed and sent.</p>
      
      <div style="${cardStyle}">
        <strong>Payout Network:</strong> ${trade.payoutNetwork}<br/>
        <strong>Phone Number:</strong> ${trade.payoutPhoneNumber}<br/>
        <strong>Reference / ID:</strong> ${trade.paymentReference || "N/A"}<br/>
        <strong>Paid Date:</strong> ${trade.paidAt ? new Date(trade.paidAt).toLocaleString() : new Date().toLocaleString()}
      </div>
      <p>Please check your mobile money wallet to confirm receipt.</p>
      <a href="${getAppUrl()}/user/trades" style="${buttonStyle}">View Trade Details</a>
    </div>
  `;
  return sendEmail({ to: user.email, subject: `Payment sent for trade ${trade.tradeId}`, html });
}

export async function sendDuplicateCardAttemptEmail(user: { email: string; username: string }, trade: any) {
  const html = `
    <div style="${containerStyle}">
      <h2>Duplicate card submission detected</h2>
      <p>Hello ${user.username},</p>
      <p>Our system detected that a gift card you recently tried to submit has already been processed or is currently active in another trade.</p>
      <p>For security and anti-fraud purposes, we cannot process duplicate cards.</p>
      <p>If you believe this is an error or need further clarification, please contact our support team immediately.</p>
      <a href="${getAppUrl()}/user/support" style="${buttonStyle}">Contact Support</a>
    </div>
  `;
  return sendEmail({ to: user.email, subject: "Duplicate card submission detected", html });
}

export async function sendAdminNewUserEmail(user: { username: string; email: string; phoneNumber: string }) {
  const adminEmail = process.env.EMAIL_ADMIN;
  if (!adminEmail) return;

  const html = `
    <div style="${containerStyle}">
      <h2>New User Registration 🎉</h2>
      <p>A new user has just signed up on Card Hive.</p>
      
      <div style="${cardStyle}">
        <h3>User Details</h3>
        <strong>Username:</strong> ${user.username}<br/>
        <strong>Email:</strong> ${user.email}<br/>
        <strong>Phone:</strong> ${user.phoneNumber}<br/>
        <strong>Registered At:</strong> ${new Date().toLocaleString()}
      </div>
      <a href="${getAppUrl()}/admin/users" style="${buttonStyle}">View Users in Admin Panel</a>
    </div>
  `;
  return sendEmail({ to: adminEmail, subject: `New User Registration: @${user.username}`, html });
}

export async function sendAdminNewTradeEmail(trade: any, user: { username: string; email: string; phoneNumber: string }) {
  const adminEmail = process.env.EMAIL_ADMIN;
  if (!adminEmail) return;

  const html = `
    <div style="${containerStyle}">
      <h2>New Trade Alert: ${trade.tradeId}</h2>
      <p>A new trade has been submitted.</p>
      
      <div style="${cardStyle}">
        <h3>User Info</h3>
        <strong>Username:</strong> ${user.username}<br/>
        <strong>Email:</strong> ${user.email}<br/>
        <strong>Phone:</strong> ${user.phoneNumber}
      </div>

      <div style="${cardStyle}">
        <h3>Trade Info</h3>
        <strong>Brand:</strong> ${trade.cardBrand}<br/>
        <strong>Value:</strong> ${trade.faceValue} ${trade.currency}<br/>
        <strong>Created:</strong> ${new Date().toLocaleString()}
      </div>
      <a href="${getAppUrl()}/admin/trades/${trade.tradeId}" style="${buttonStyle}">Review Trade</a>
    </div>
  `;
  return sendEmail({ to: adminEmail, subject: `New Card Hive trade: ${trade.tradeId}`, html });
}

export async function sendAdminDuplicateAlert(trade: any, relatedTrades: any[], user: { username: string; email: string }) {
  const adminEmail = process.env.EMAIL_ADMIN;
  if (!adminEmail) return;

  const relatedHtml = relatedTrades.map((rt: any) => `<li><a href="${getAppUrl()}/admin/trades/${rt.tradeId}">${rt.tradeId}</a> - Status: ${rt.status}</li>`).join("");

  const html = `
    <div style="${containerStyle}; border: 2px solid #ef4444;">
      <h2 style="color: #ef4444;">⚠️ Duplicate or suspicious trade attempt</h2>
      <p>A user attempted to submit a card code that exactly matches an existing trade code hash.</p>
      
      <div style="${cardStyle}">
        <strong>Attempted by:</strong> @${user.username} (${user.email})<br/>
        <strong>Brand/Value:</strong> ${trade.cardBrand} ${trade.faceValue} ${trade.currency}
      </div>

      <div style="${cardStyle}">
        <h3 style="margin-top:0;">Matching Trades Found:</h3>
        <ul>
          ${relatedHtml}
        </ul>
      </div>
      <p>Please review immediately.</p>
    </div>
  `;
  return sendEmail({ to: adminEmail, subject: `Duplicate or suspicious trade attempt by @${user.username}`, html });
}

export async function sendAdminErrorAlert(details: string, context?: any) {
  const adminEmail = process.env.EMAIL_ADMIN;
  if (!adminEmail) return;

  const html = `
    <div style="${containerStyle}; border: 2px solid #f59e0b;">
      <h2 style="color: #f59e0b;">Card Hive System Alert</h2>
      <p>An unexpected error occurred in the system:</p>
      
      <div style="${cardStyle}; background-color: #fef3c7;">
        <pre style="white-space: pre-wrap; word-break: break-word;">${details}</pre>
        ${context ? `<pre style="font-size: 12px; margin-top: 10px;">${JSON.stringify(context, null, 2)}</pre>` : ''}
      </div>
    </div>
  `;
  return sendEmail({ to: adminEmail, subject: "Card Hive Email/System Error", html });
}
