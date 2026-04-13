import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`;

  await resend.emails.send({
    from: process.env.EMAIL_FROM || "onboarding@resend.dev",
    to: email,
    subject: "重設您的密碼 - 麻雀約局系統",
    html: `
      <div style="font-family: sans-serif; font-size: 20px; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #dc2626; font-size: 28px;">麻雀約局系統</h1>
        <p>您好！</p>
        <p>我們收到了您的密碼重設請求。</p>
        <p>請點擊下面的按鈕來重設密碼：</p>
        <a href="${resetUrl}" 
           style="display: inline-block; background: #dc2626; color: white; padding: 16px 32px; 
                  font-size: 22px; text-decoration: none; border-radius: 8px; margin: 20px 0;">
          👉 重設密碼
        </a>
        <p style="color: #666; font-size: 16px;">此連結將在 1 小時後失效。</p>
        <p style="color: #666; font-size: 16px;">如果您沒有要求重設密碼，請忽略此郵件。</p>
      </div>
    `,
  });
}

export async function sendApprovalEmail(email: string, userName: string, date: string, timeSlot: string, location: string) {
  await resend.emails.send({
    from: process.env.EMAIL_FROM || "onboarding@resend.dev",
    to: email,
    subject: "報名已批准！🀄 - 麻雀約局系統",
    html: `
      <div style="font-family: sans-serif; font-size: 20px; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #dc2626; font-size: 28px;">🀄 麻雀約局系統</h1>
        <p>Hi ${userName}！</p>
        <p style="font-size: 24px; font-weight: bold; color: #16a34a;">✅ 你的報名已獲批准！</p>
        <div style="background: #f0fdf4; border: 2px solid #86efac; border-radius: 12px; padding: 20px; margin: 20px 0;">
          <p style="margin: 8px 0;">📅 <strong>日期：</strong>${date}</p>
          <p style="margin: 8px 0;">⏰ <strong>時段：</strong>${timeSlot}</p>
          <p style="margin: 8px 0;">📍 <strong>地點：</strong>${location}</p>
        </div>
        <p style="font-size: 22px;">準時嚟啦！到時見！🎉</p>
      </div>
    `,
  });
}

export async function sendRejectionEmail(email: string, userName: string, date: string, timeSlot: string) {
  await resend.emails.send({
    from: process.env.EMAIL_FROM || "onboarding@resend.dev",
    to: email,
    subject: "報名未獲批准 - 麻雀約局系統",
    html: `
      <div style="font-family: sans-serif; font-size: 20px; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #dc2626; font-size: 28px;">🀄 麻雀約局系統</h1>
        <p>Hi ${userName}！</p>
        <p style="font-size: 24px; font-weight: bold; color: #dc2626;">❌ 你的報名未獲批准</p>
        <div style="background: #fef2f2; border: 2px solid #fca5a5; border-radius: 12px; padding: 20px; margin: 20px 0;">
          <p style="margin: 8px 0;">📅 <strong>日期：</strong>${date}</p>
          <p style="margin: 8px 0;">⏰ <strong>時段：</strong>${timeSlot}</p>
        </div>
        <p>如有疑問，請聯絡管理員。</p>
      </div>
    `,
  });
}
