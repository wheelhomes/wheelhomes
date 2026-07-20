export const welcomeEmailTemplate = (name: string) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #007bff; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    .button { display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; }
    .footer { text-align: center; margin-top: 20px; font-size: 0.8em; color: #777; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to Find Home!</h1>
    </div>
    <div class="content">
      <p>Hi ${name},</p>
      <p>We are thrilled to have you on board! You can now browse properties, connect with service providers, and manage your home requests all in one place.</p>
      <p>Click below to explore your dashboard:</p>
      <p style="text-align: center;">
        <a href="https://find-home-app.web.app/dashboard" class="button">Go to Dashboard</a>
      </p>
      <p>If you have any questions, feel free to reply to this email.</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Find Home. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

export const passwordResetEmailTemplate = (otp: string) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #dc3545; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    .otp { font-size: 24px; font-weight: bold; letter-spacing: 5px; text-align: center; margin: 20px 0; border: 1px dashed #ccc; padding: 10px; }
    .footer { text-align: center; margin-top: 20px; font-size: 0.8em; color: #777; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Password Reset Request</h1>
    </div>
    <div class="content">
      <p>Hello,</p>
      <p>We received a request to reset your password. Use the code below to complete the process:</p>
      <div class="otp">${otp}</div>
      <p>This code will expire in 15 minutes.</p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Find Home. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;
