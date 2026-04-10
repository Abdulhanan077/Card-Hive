import nodemailer from "nodemailer";

type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
};

const getAppUrl = () => process.env.APP_URL || "http://localhost:3000";

const transporter = nodemailer.createTransport({
  host: process.env.ZEPTOMAIL_SMTP_HOST || "smtp.zeptomail.com",
  port: 465,
  secure: true, // Port 465 uses SSL
  auth: {
    user: process.env.ZEPTOMAIL_SMTP_USER || "emailapikey",
    pass: process.env.ZEPTOMAIL_SMTP_PASS,
  },
});

import fs from "fs";
import path from "path";

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  if (!process.env.ZEPTOMAIL_SMTP_PASS || !process.env.EMAIL_FROM) {
    console.warn("Missing ZeptoMail SMTP credentials. Email sending skipped.");
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: `"Card Hive" <${process.env.EMAIL_FROM}>`,
      to,
      subject,
      html,
    });

    console.log("Email sent via ZeptoMail SMTP:", info.messageId);
  } catch (err) {
    console.error("ZeptoMail SMTP error:", err);
  }
}

// --- Professional Email Template Wrapper ---

const wrapTemplate = (content: string, preheader?: string) => {
  const logoUrl = "cid:logo";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Card Hive Notification</title>
    <style>
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background-color: #f3f4f6; }
        .wrapper { width: 100%; table-layout: fixed; background-color: #f3f4f6; padding-bottom: 40px; }
        .main { background-color: #ffffff; max-width: 600px; margin: 0 auto; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
        .header { background-color: #0ea5e9; padding: 32px 20px; text-align: center; }
        .header img { max-height: 48px; width: auto; }
        .content { padding: 40px 32px; }
        .footer { padding: 32px; text-align: center; color: #6b7280; font-size: 14px; }
        .button { display: inline-block; padding: 12px 24px; background-color: #0ea5e9; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 24px 0; }
        .card { background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .divider { border-top: 1px solid #e5e7eb; margin: 32px 0; }
        .ps { font-size: 14px; color: #6b7280; margin-top: 24px; }
        @media screen and (max-width: 600px) {
            .content { padding: 32px 20px; }
        }
    </style>
</head>
<body>
    <div class="wrapper">
        <div style="display: none; max-height: 0px; overflow: hidden;">${preheader || ''}</div>
        <table class="main" width="100%" cellpadding="0" cellspacing="0">
            <!-- Header -->
              <tr>
                <td style="padding: 40px 0; text-align: center; background-color: #0ea5e9;">
                  <span style="color: #ffffff; font-size: 28px; font-weight: 800; letter-spacing: -0.025em; font-family: 'Outfit', 'Inter', sans-serif; display: inline-block;">
                    CARD HIVE
                  </span>
                </td>
              </tr>
            <tr>
                <td class="content">
                    ${content}
                    <div class="divider"></div>
                    <p>Best regards,<br><strong>The Card Hive Team</strong></p>
                </td>
            </tr>
            <tr>
                <td class="footer">
                    <p>&copy; ${new Date().getFullYear()} Card Hive. All rights reserved.</p>
                    <p>This is an automated notification. Please do not reply to this email.</p>
                </td>
            </tr>
        </table>
    </div>
</body>
</html>
  `;
};

// --- Email Templates ---

export async function sendWelcomeEmail(user: { email: string; username: string }) {
  const content = `
    <h1 style="margin-top: 0; color: #111827;">Welcome to Card Hive, ${user.username}! 🎉</h1>
    <p>We're thrilled to have you join our community. Card Hive is designed to give you the most secure and instant cash for your gift cards.</p>
    <p>You can now start trading your cards at the best rates in the market. Check out your dashboard to see our latest rates and start your first trade.</p>
    <a href="${getAppUrl()}/user" class="button">Go to Dashboard</a>
    <p>If you have any questions, our support team is just a message away.</p>
  `;
  const html = wrapTemplate(content, "Welcome to the Hive!");
  return sendEmail({ to: user.email, subject: "Welcome to Card Hive", html });
}

export async function sendOTPEmail(email: string, otp: string) {
  const content = `
    <h1 style="margin-top: 0; color: #111827;">Verify Your Email</h1>
    <p>Thank you for choosing Card Hive. Use the verification code below to complete your registration:</p>
    <div class="card" style="text-align: center; letter-spacing: 4px;">
        <span style="font-size: 32px; font-weight: 700; color: #0ea5e9;">${otp}</span>
    </div>
    <p>This code will expire in 10 minutes. If you didn't request this code, please ignore this email.</p>
  `;
  const html = wrapTemplate(content, "Your verification code");
  return sendEmail({ to: email, subject: "Your Verification Code - Card Hive", html });
}

export async function sendPasswordResetOTPEmail(email: string, otp: string) {
  const content = `
    <h1 style="margin-top: 0; color: #111827;">Reset Your Password</h1>
    <p>We received a request to reset your Card Hive password. Use the code below to proceed:</p>
    <div class="card" style="text-align: center; letter-spacing: 4px;">
        <span style="font-size: 32px; font-weight: 700; color: #0ea5e9;">${otp}</span>
    </div>
    <p>This code will expire in 10 minutes. If you didn't request a password reset, your account is safe.</p>
  `;
  const html = wrapTemplate(content, "Password reset code");
  return sendEmail({ to: email, subject: "Reset your Password - Card Hive", html });
}

export async function sendPasswordResetEmail(user: { email: string }, token: string) {
  const resetUrl = `${getAppUrl()}/reset-password?token=${token}`;
  const content = `
    <h1 style="margin-top: 0; color: #111827;">Reset Your Password</h1>
    <p>Click the button below to reset your Card Hive password. This link is valid for 1 hour.</p>
    <a href="${resetUrl}" class="button">Reset Password</a>
    <p>If you didn't request this, you can safely ignore this email.</p>
  `;
  const html = wrapTemplate(content, "Reset your password link");
  return sendEmail({ to: user.email, subject: "Reset your Card Hive password", html });
}

export async function sendTradeSubmittedEmail(user: { email: string; username: string }, trades: any | any[]) {
  const tradesArray = Array.isArray(trades) ? trades : [trades];
  const isBatch = tradesArray.length > 1;
  const tradeRef = isBatch && tradesArray[0].fullName ? tradesArray[0].fullName : tradesArray[0].tradeId;
  const totalAmount = tradesArray.reduce((sum, t) => sum + t.faceValue, 0);
  const currency = tradesArray[0].currency;
  const brands = Array.from(new Set(tradesArray.map(t => t.cardBrand))).join(', ');

  const content = `
    <h1 style="margin-top: 0; color: #111827;">Trade Received! 📥</h1>
    <p>Hello ${user.username}, we've received your submission for trade <strong>${tradeRef}</strong>. Our team is already reviewing it.</p>
    <div class="card">
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: #6b7280;">Reference ID:</span>
            <span style="font-weight: 600;">${tradeRef}</span>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: #6b7280;">${isBatch ? 'Cards Included' : 'Card Brand'}:</span>
            <span style="font-weight: 600;">${isBatch ? `${tradesArray.length} Cards (${brands})` : tradesArray[0].cardBrand}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
            <span style="color: #6b7280;">${isBatch ? 'Total Value' : 'Amount'}:</span>
            <span style="font-weight: 600;">${totalAmount} ${currency}</span>
        </div>
    </div>
    <a href="${getAppUrl()}/user/trades" class="button">Track Your Trade</a>
  `;
  const html = wrapTemplate(content, `Trade ${tradeRef} received`);
  return sendEmail({ to: user.email, subject: `We received your trade ${tradeRef}`, html });
}

export async function sendTradeStatusUpdateEmail(user: { email: string; username: string }, trades: any | any[], oldStatus: string, newStatus: string) {
  const tradesArray = Array.isArray(trades) ? trades : [trades];
  const isBatch = tradesArray.length > 1;
  const tradeRef = isBatch && tradesArray[0].fullName ? tradesArray[0].fullName : tradesArray[0].tradeId;

  let subject = `Your trade ${tradeRef} status has been updated`;
  let statusColor = "#3b82f6";

  if (newStatus === "APPROVED") statusColor = "#10b981";
  if (newStatus === "REJECTED") statusColor = "#ef4444";
  if (newStatus === "PAID") statusColor = "#10b981";

  let statusText = newStatus.replace("_", " ");

  const content = `
    <h1 style="margin-top: 0; color: #111827;">Status Updated</h1>
    <p>The status of your trade <strong>${tradeRef}</strong> has changed:</p>
    <div class="card" style="text-align: center;">
        <span style="font-size: 14px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">New Status</span><br>
        <span style="font-size: 24px; font-weight: 700; color: ${statusColor};">${statusText}</span>
    </div>
    ${newStatus === "REJECTED" && tradesArray[0].adminNotes ? `
        <div style="margin-top: 16px; color: #ef4444;">
            <strong>Note from Admin:</strong> ${tradesArray[0].adminNotes}
        </div>
    ` : ''}
    <a href="${getAppUrl()}/user/trades" class="button">View Details</a>
  `;
  const html = wrapTemplate(content, `Trade ${tradeRef} updated to ${statusText}`);
  return sendEmail({ to: user.email, subject, html });
}

export async function sendPaymentSentEmail(user: { email: string; username: string }, trades: any | any[]) {
  const tradesArray = Array.isArray(trades) ? trades : [trades];
  const isBatch = tradesArray.length > 1;
  const tradeRef = isBatch && tradesArray[0].fullName ? tradesArray[0].fullName : tradesArray[0].tradeId;
  const totalAmount = tradesArray.reduce((sum, t) => sum + t.faceValue, 0);
  const currency = tradesArray[0].currency;
  const trade = tradesArray[0];

  const content = `
    <h1 style="margin-top: 0; color: #111827;">Payment Sent! 💸</h1>
    <p>Great news, ${user.username}! Your payment for trade <strong>${tradeRef}</strong> has been processed.</p>
    <div class="card">
        ${trade.payoutMethod === 'CRYPTO' ? `
            <p><strong>Crypto:</strong> ${trade.cryptoCoin} (${trade.cryptoNetwork})</p>
            <p><strong>Receiver ID:</strong> ${trade.cryptoReceiverId}</p>
        ` : `
            <p><strong>Network:</strong> ${trade.payoutNetwork}</p>
            <p><strong>Phone:</strong> ${trade.payoutPhoneNumber}</p>
        `}
        <p><strong>${isBatch ? 'Total Amount' : 'Amount'}:</strong> ${totalAmount} ${currency}</p>
    </div>
    <p>Please check your wallet/account. It may take a few minutes to reflect.</p>
    <a href="${getAppUrl()}/user/trades" class="button">View History</a>
  `;
  const html = wrapTemplate(content, `Payment sent for ${tradeRef}`);
  return sendEmail({ to: user.email, subject: `Payment sent for trade ${tradeRef}`, html });
}

export async function sendDuplicateCardAttemptEmail(user: { email: string; username: string }, trade: any) {
  const content = `
    <h1 style="margin-top: 0; color: #111827;">Security Verification</h1>
    <p>Hello ${user.username}, our system flagged a duplicate card code submission in your recent trade attempt.</p>
    <p>To protect our community, we do not process codes that have already been submitted. If you believe this is an error, please contact our support team immediately.</p>
    <a href="${getAppUrl()}/user/support" class="button" style="background-color: #ef4444;">Contact Support</a>
  `;
  const html = wrapTemplate(content, "Duplicate card submission alert");
  return sendEmail({ to: user.email, subject: "Action Required: Trade Status Verification - Card Hive", html });
}

export async function sendItemRejectionEmail(user: { email: string; username: string }, rejectedTrade: any, batchTrades: any[]) {
  const isBatch = batchTrades.length > 1;
  const workspaceId = isBatch ? (batchTrades[0].fullName || batchTrades[0].tradeId) : rejectedTrade.tradeId;
  
  const rejectedCount = batchTrades.filter(t => t.status === "REJECTED").length;
  const successCount = batchTrades.filter(t => ["PAID", "COMPLETED", "APPROVED"].includes(t.status)).length;
  const pendingCount = batchTrades.length - rejectedCount - successCount;

  const content = `
    <h1 style="margin-top: 0; color: #ef4444;">Card Rejected 🚫</h1>
    <p>Hello ${user.username}, an item in your trade <strong>${workspaceId}</strong> has been rejected.</p>
    
    <div class="card" style="border-left: 4px solid #ef4444;">
        <h3 style="margin-top: 0; color: #ef4444;">Rejected Item Details</h3>
        <p><strong>Brand:</strong> ${rejectedTrade.cardBrand}</p>
        <p><strong>Value:</strong> ${rejectedTrade.faceValue} ${rejectedTrade.currency}</p>
        ${rejectedTrade.adminNotes ? `<p><strong>Reason:</strong> ${rejectedTrade.adminNotes}</p>` : ''}
    </div>

    ${isBatch ? `
    <div class="card">
        <h3 style="margin-top: 0;">Batch Overview (${batchTrades.length} Cards)</h3>
        <div style="display: flex; gap: 20px;">
            <div style="text-align: center; flex: 1;">
                <span style="display: block; font-size: 20px; font-weight: 700; color: #ef4444;">${rejectedCount}</span>
                <span style="font-size: 12px; color: #6b7280; text-transform: uppercase;">Rejected</span>
            </div>
            <div style="text-align: center; flex: 1;">
                <span style="display: block; font-size: 20px; font-weight: 700; color: #10b981;">${successCount}</span>
                <span style="font-size: 12px; color: #6b7280; text-transform: uppercase;">Successful</span>
            </div>
            ${pendingCount > 0 ? `
            <div style="text-align: center; flex: 1;">
                <span style="display: block; font-size: 20px; font-weight: 700; color: #f59e0b;">${pendingCount}</span>
                <span style="font-size: 12px; color: #6b7280; text-transform: uppercase;">Pending</span>
            </div>
            ` : ''}
        </div>
    </div>
    ` : ''}

    <p>You can view the full details and proof of rejection in the trade chat.</p>
    <a href="${getAppUrl()}/user/trades" class="button">View My Trades</a>
  `;
  
  const html = wrapTemplate(content, `Item rejected in trade ${workspaceId}`);
  return sendEmail({ to: user.email, subject: `Action Required: Card Rejected - ${workspaceId}`, html });
}

export async function sendAdminNewUserEmail(user: { username: string; email: string; phoneNumber: string }) {
  const adminEmail = process.env.EMAIL_ADMIN;
  if (!adminEmail) return;

  const content = `
    <h1 style="margin-top: 0; color: #111827;">New Registration 🎉</h1>
    <p>A new user has just joined Card Hive.</p>
    <div class="card">
        <p><strong>Username:</strong> ${user.username}</p>
        <p><strong>Email:</strong> ${user.email}</p>
        <p><strong>Phone:</strong> ${user.phoneNumber}</p>
        <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
    </div>
    <a href="${getAppUrl()}/admin/users" class="button">Manage Users</a>
  `;
  const html = wrapTemplate(content, `New user: @${user.username}`);
  return sendEmail({ to: adminEmail, subject: `New User Registration: @${user.username}`, html });
}

export async function sendAdminNewTradeEmail(trades: any | any[], user: { username: string; email: string; phoneNumber: string }) {
  const adminEmail = process.env.EMAIL_ADMIN;
  if (!adminEmail) return;
  const tradesArray = Array.isArray(trades) ? trades : [trades];
  const isBatch = tradesArray.length > 1;
  const tradeRef = isBatch && tradesArray[0].fullName ? tradesArray[0].fullName : tradesArray[0].tradeId;
  const totalAmount = tradesArray.reduce((sum, t) => sum + t.faceValue, 0);
  const currency = tradesArray[0].currency;
  const brands = Array.from(new Set(tradesArray.map(t => t.cardBrand))).join(', ');
  const trade = tradesArray[0];

  const content = `
    <h1 style="margin-top: 0; color: #111827;">New Trade Alert! 🚨</h1>
    <p>A new trade has been submitted by <strong>@${user.username}</strong>.</p>
    <div class="card">
        <h3 style="margin-top: 0;">Trade Info</h3>
        <p><strong>Reference:</strong> ${tradeRef}</p>
        <p><strong>${isBatch ? 'Cards Included' : 'Brand'}:</strong> ${isBatch ? `${tradesArray.length} Cards (${brands})` : trade.cardBrand}</p>
        <p><strong>${isBatch ? 'Total Value' : 'Value'}:</strong> ${totalAmount} ${currency}</p>
        <p><strong>Payout:</strong> ${trade.payoutMethod === 'CRYPTO' ? 'Crypto' : trade.payoutNetwork}</p>
    </div>
    <a href="${getAppUrl()}/admin/trades/${trade.tradeId}" class="button">Review Trade</a>
  `;
  const html = wrapTemplate(content, `Action required: Trade ${tradeRef}`);
  return sendEmail({ to: adminEmail, subject: `New Card Hive trade: ${tradeRef}`, html });
}

export async function sendAdminDuplicateAlert(trade: any, relatedTrades: any[], user: { username: string; email: string }) {
  const adminEmail = process.env.EMAIL_ADMIN;
  if (!adminEmail) return;

  const relatedHtml = relatedTrades.map((rt: any) => `<li><a href="${getAppUrl()}/admin/trades/${rt.tradeId}" style="color: #0ea5e9;">${rt.tradeId}</a> - Status: ${rt.status}</li>`).join("");

  const content = `
    <h1 style="margin-top: 0; color: #ef4444;">Duplicate Code Alert! ⚠️</h1>
    <p>User <strong>@${user.username}</strong> attempted to submit a card code that exists in our records.</p>
    <div class="card">
        <strong>Details:</strong> ${trade.cardBrand} ${trade.faceValue} ${trade.currency}
    </div>
    <div class="card">
        <h3 style="margin-top:0;">Matching Entries:</h3>
        <ul style="padding-left: 20px;">
          ${relatedHtml}
        </ul>
    </div>
  `;
  const html = wrapTemplate(content, "Critical: Duplicate card code submission");
  return sendEmail({ to: adminEmail, subject: `Action Required: Card review for @${user.username}`, html });
}

export async function sendAdminErrorAlert(details: string, context?: any) {
  const adminEmail = process.env.EMAIL_ADMIN;
  if (!adminEmail) return;

  const content = `
    <h1 style="margin-top: 0; color: #f59e0b;">System Alert</h1>
    <p>An unexpected error occurred:</p>
    <div class="card" style="background-color: #fffbeb;">
        <pre style="white-space: pre-wrap; word-break: break-word; font-size: 12px;">${details}</pre>
        ${context ? `<pre style="font-size: 11px; margin-top: 10px;">${JSON.stringify(context, null, 2)}</pre>` : ''}
    </div>
  `;
  const html = wrapTemplate(content, "System error notification");
  return sendEmail({ to: adminEmail, subject: "Card Hive Email/System Error", html });
}

export async function sendAdminNewMessageEmail(message: any, tradeId: string, sender: { username: string }) {
  const adminEmail = process.env.EMAIL_ADMIN;
  if (!adminEmail) return;

  const content = `
    <h1 style="margin-top: 0; color: #111827;">New Message 💬</h1>
    <p><strong>@${sender.username}</strong> sent a message about trade <strong>${tradeId}</strong>:</p>
    <div class="card" style="font-style: italic; border-left: 4px solid #0ea5e9;">
        "${message.content}"
    </div>
    <a href="${getAppUrl()}/admin/trades/${tradeId}" class="button">Open Chat</a>
  `;
  const html = wrapTemplate(content, `Message from @${sender.username}`);
  return sendEmail({ to: adminEmail, subject: `New Message from @${sender.username} - Trade ${tradeId}`, html });
}
