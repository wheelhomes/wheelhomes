// ═════════════════════════════════════════════════════════════════════════════
// WHEEL OF COMFORT - OFFICIAL EMAIL DESIGN SYSTEM
// Inspired by geometric layered executive branding (Navy #0F172A, Ocean #0284C7, Cyan #38BDF8)
// ═════════════════════════════════════════════════════════════════════════════

interface EmailWrapperProps {
  title: string;
  previewText: string;
  subtitle: string;
  badgeText?: string;
  badgeColor?: 'green' | 'amber' | 'red' | 'blue';
  bodyContent: string;
}

const getBadgeStyles = (color: 'green' | 'amber' | 'red' | 'blue' = 'blue') => {
  switch (color) {
    case 'green':
      return { bg: '#ECFDF5', border: '#A7F3D0', text: '#047857', icon: '✓' };
    case 'amber':
      return { bg: '#FFFBEB', border: '#FDE68A', text: '#B45309', icon: '⏱' };
    case 'red':
      return { bg: '#FEF2F2', border: '#FECACA', text: '#B91C1C', icon: '⚠' };
    case 'blue':
    default:
      return { bg: '#EFF6FF', border: '#BFDBFE', text: '#1D4ED8', icon: '✦' };
  }
};

/**
 * Returns the active base application URL.
 * Prioritizes NEXT_PUBLIC_APP_URL, VERCEL_URL, or defaults to local dev server.
 */
export const getAppBaseUrl = (): string => {
  const explicit = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (explicit && explicit.trim() && !explicit.includes('localhost')) {
    return explicit.trim().replace(/\/+$/, '');
  }
  if (process.env.VERCEL_URL) {
    const url = process.env.VERCEL_URL.trim().replace(/\/+$/, '');
    return url.startsWith('http') ? url : `https://${url}`;
  }
  // Default to live production URL so real emails always link to the live domain
  return 'https://wheelofcomfort.vercel.app';
};


/**
 * High-fidelity, email-client bulletproof email wrapper
 * featuring the geometric layered banner header and multi-column contact footer.
 */
export const emailWrapper = ({
  title,
  previewText,
  subtitle,
  badgeText,
  badgeColor = 'blue',
  bodyContent,
}: EmailWrapperProps) => {
  const badge = getBadgeStyles(badgeColor);
  const currentYear = new Date().getFullYear();
  const baseUrl = getAppBaseUrl();
  const displayHost = baseUrl.replace(/^https?:\/\//, '');

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; background-color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B; }
    .email-container { max-width: 620px; margin: 0 auto; background-color: #FFFFFF; }
    @media only screen and (max-width: 620px) {
      .responsive-table { width: 100% !important; }
      .mobile-padding { padding-left: 20px !important; padding-right: 20px !important; }
      .footer-col { display: block !important; width: 100% !important; margin-bottom: 12px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 24px 0; background-color: #F1F5F9;">
  <!-- Preview Text (Hidden in body, visible in inbox preview) -->
  <div style="display: none; font-size: 1px; color: #F1F5F9; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    ${previewText}
  </div>

  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td align="center" style="padding: 12px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="620" class="email-container" style="max-width: 620px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04); border: 1px solid #E2E8F0;">
          
          <!-- ═══════════════════════════════════════════════ -->
          <!-- HEADER: GEOMETRIC LAYERED BRAND BANNER         -->
          <!-- ═══════════════════════════════════════════════ -->
          <tr>
            <td style="background-color: #0F172A; padding: 0; margin: 0;">
              <!-- Top Accent Gradient Line -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td height="4" style="background: linear-gradient(90deg, #38BDF8 0%, #0284C7 50%, #10B981 100%); line-height: 4px; font-size: 4px;">&nbsp;</td>
                </tr>
              </table>

              <!-- Banner Main Content with Geometric Diagonal Accent -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding: 32px 32px 24px 32px; background: linear-gradient(135deg, #0F172A 0%, #0B192C 45%, #0369A1 100%); position: relative;" class="mobile-padding">
                    
                    <!-- Brand Top Bar (Logo + Tagline) -->
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td align="left" valign="middle">
                          <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                            <tr>
                              <!-- Interlocking Rings / Wheel Geometric Icon (from reference design) -->
                              <td valign="middle" style="padding-right: 12px;">
                                <div style="width: 38px; height: 38px; background: linear-gradient(135deg, #38BDF8 0%, #0284C7 100%); border-radius: 10px; text-align: center; line-height: 38px; box-shadow: 0 4px 10px rgba(2, 132, 199, 0.35);">
                                  <span style="font-size: 20px; line-height: 38px;">🏡</span>
                                </div>
                              </td>
                              <td valign="middle">
                                <div style="font-size: 19px; font-weight: 800; letter-spacing: 0.04em; color: #FFFFFF; line-height: 1.1; text-transform: uppercase;">
                                  Wheel of Comfort
                                </div>
                                <div style="font-size: 10px; font-weight: 700; letter-spacing: 0.12em; color: #38BDF8; text-transform: uppercase; margin-top: 3px;">
                                  Wheelhomes Platform
                                </div>
                              </td>
                            </tr>
                          </table>
                        </td>
                        <td align="right" valign="middle">
                          <span style="display: inline-block; padding: 4px 12px; background-color: rgba(56, 189, 248, 0.12); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 20px; font-size: 10px; font-weight: 700; letter-spacing: 0.06em; color: #E0F2FE; text-transform: uppercase;">
                            Verified Service
                          </span>
                        </td>
                      </tr>
                    </table>

                    <!-- Divider with Geometric Fold Accent -->
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0 16px 0;">
                      <tr>
                        <td height="1" style="background-color: rgba(226, 232, 240, 0.15); line-height: 1px; font-size: 1px;">&nbsp;</td>
                      </tr>
                    </table>

                    <!-- Header Titles -->
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td align="left">
                          <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #FFFFFF; line-height: 1.25; letter-spacing: -0.01em;">
                            ${title}
                          </h1>
                          <p style="margin: 6px 0 0 0; font-size: 13px; color: #94A3B8; line-height: 1.4;">
                            ${subtitle}
                          </p>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>

                <!-- Geometric Facet Fold Strip (Layered Chevrons from reference design) -->
                <tr>
                  <td style="background-color: #082F49; padding: 0;">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td width="30%" height="6" style="background-color: #0F172A; line-height: 6px; font-size: 6px;">&nbsp;</td>
                        <td width="40%" height="6" style="background-color: #0369A1; line-height: 6px; font-size: 6px;">&nbsp;</td>
                        <td width="30%" height="6" style="background-color: #38BDF8; line-height: 6px; font-size: 6px;">&nbsp;</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ═══════════════════════════════════════════════ -->
          <!-- BODY CONTENT AREA                              -->
          <!-- ═══════════════════════════════════════════════ -->
          <tr>
            <td style="padding: 32px 32px 28px 32px; background-color: #FFFFFF;" class="mobile-padding">
              
              ${badgeText ? `
              <!-- Status Pill Badge -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
                <tr>
                  <td style="background-color: ${badge.bg}; border: 1px solid ${badge.border}; border-radius: 20px; padding: 6px 14px; font-size: 12px; font-weight: 700; color: ${badge.text};">
                    <span style="margin-right: 4px;">${badge.icon}</span> ${badgeText}
                  </td>
                </tr>
              </table>
              ` : ''}

              <!-- Body Injected Content -->
              ${bodyContent}

            </td>
          </tr>

          <!-- ═══════════════════════════════════════════════ -->
          <!-- FOOTER: MULTI-COLUMN CONTACT STRIP             -->
          <!-- ═══════════════════════════════════════════════ -->
          <tr>
            <td style="background-color: #0F172A; padding: 0;">
              
              <!-- Trust & Security Strip -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #1E293B; border-bottom: 1px solid rgba(226, 232, 240, 0.1);">
                <tr>
                  <td style="padding: 12px 28px;" align="center">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size: 11px; font-weight: 600; color: #94A3B8; letter-spacing: 0.02em;">
                          🛡️ <strong style="color: #F8FAFC;">Escrow Protection Guaranteed</strong> &nbsp;|&nbsp; ⚡ <strong style="color: #F8FAFC;">Verified Artisan Network</strong>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- 3-Column Contact Strip (modeled from reference design banner footer) -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="padding: 24px 28px 20px 28px;" class="mobile-padding">
                <tr>
                  <td>
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <!-- Col 1: Direct Support Email -->
                        <td width="33%" valign="top" class="footer-col" style="padding-right: 10px;">
                          <div style="font-size: 10px; font-weight: 700; color: #38BDF8; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px;">
                            ✉ Support & Inquiries
                          </div>
                          <div style="font-size: 12px; color: #F8FAFC; word-break: break-all;">
                            <a href="mailto:wheelofcomfort@gmail.com" style="color: #F8FAFC; text-decoration: none;">wheelofcomfort@gmail.com</a>
                          </div>
                        </td>

                        <!-- Col 2: Web Platform Portal -->
                        <td width="33%" valign="top" class="footer-col" style="padding: 0 10px;">
                          <div style="font-size: 10px; font-weight: 700; color: #38BDF8; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px;">
                            🌐 Web Portal
                          </div>
                          <div style="font-size: 12px; color: #F8FAFC;">
                            <a href="${baseUrl}" style="color: #F8FAFC; text-decoration: none;">${displayHost}</a>
                          </div>
                        </td>

                        <!-- Col 3: Location / Region -->
                        <td width="33%" valign="top" class="footer-col" style="padding-left: 10px;">
                          <div style="font-size: 10px; font-weight: 700; color: #38BDF8; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px;">
                            📍 Operating Office
                          </div>
                          <div style="font-size: 12px; color: #E2E8F0;">
                            Lagos, Nigeria
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Deep Slate Copyright & Legal Bottom Bar -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #090E17; padding: 16px 28px; border-top: 1px solid rgba(255, 255, 255, 0.05);">
                <tr>
                  <td align="center">
                    <p style="margin: 0; font-size: 11px; color: #64748B; line-height: 1.5;">
                      &copy; ${currentYear} <strong>Wheel of Comfort Technologies</strong>. All rights reserved.
                    </p>
                    <p style="margin: 4px 0 0 0; font-size: 10px; color: #475569;">
                      This is an official transactional message regarding your Wheel of Comfort / Wheelhomes account.
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

// ═════════════════════════════════════════════════════════════════════════════
// 1. WELCOME EMAIL
// ═════════════════════════════════════════════════════════════════════════════

export const welcomeEmailTemplate = (name: string) => {
  const content = `
    <p style="font-size: 16px; color: #0F172A; margin: 0 0 16px 0;">Hello <strong>${name}</strong>,</p>
    <p style="font-size: 15px; color: #334155; line-height: 1.6; margin: 0 0 16px 0;">
      Welcome to <strong>Wheel of Comfort</strong>! We are delighted to have you join our trusted ecosystem connecting property seekers, homeowners, and verified artisans.
    </p>

    <!-- Key Benefits Grid -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; margin: 20px 0; padding: 16px;">
      <tr>
        <td style="padding: 8px 12px;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td width="30" valign="top" style="font-size: 18px;">🏡</td>
              <td style="font-size: 13px; color: #334155; line-height: 1.5;">
                <strong style="color: #0F172A;">Browse Verified Real Estate:</strong> Discover inspected homes, apartments, and commercial spaces.
              </td>
            </tr>
            <tr><td height="10"></td></tr>
            <tr>
              <td width="30" valign="top" style="font-size: 18px;">🛠️</td>
              <td style="font-size: 13px; color: #334155; line-height: 1.5;">
                <strong style="color: #0F172A;">Book Background-Checked Artisans:</strong> Instant service requests for plumbing, electrical, and maintenance.
              </td>
            </tr>
            <tr><td height="10"></td></tr>
            <tr>
              <td width="30" valign="top" style="font-size: 18px;">🛡️</td>
              <td style="font-size: 13px; color: #334155; line-height: 1.5;">
                <strong style="color: #0F172A;">100% Escrow Protection:</strong> Funds remain securely locked until the service is completed to your satisfaction.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0 16px 0;">
      <tr>
        <td align="center">
          <a href="${getAppBaseUrl()}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #0284C7 0%, #0369A1 100%); color: #FFFFFF; text-decoration: none; font-weight: 700; font-size: 14px; padding: 14px 32px; border-radius: 8px; box-shadow: 0 4px 10px rgba(2, 132, 199, 0.3);">
            Access Your Dashboard &rarr;
          </a>
        </td>
      </tr>
    </table>

    <p style="font-size: 13px; color: #64748B; margin-top: 24px; text-align: center;">
      Need help getting started? Simply reply directly to this email or reach us at <a href="mailto:wheelofcomfort@gmail.com" style="color: #0284C7;">wheelofcomfort@gmail.com</a>.
    </p>
  `;

  return emailWrapper({
    title: 'Welcome to Wheel of Comfort',
    previewText: 'Welcome aboard! Your Wheel of Comfort account is ready.',
    subtitle: 'Your platform for verified properties and on-demand artisans',
    badgeText: 'Account Created Successfully',
    badgeColor: 'blue',
    bodyContent: content,
  });
};

export const welcomeEmailText = (name: string) => {
  const baseUrl = getAppBaseUrl();
  return `
Welcome to Wheel of Comfort!

Hello ${name},

Welcome aboard! We are delighted to have you join Wheel of Comfort.
You can now explore verified real estate, book background-checked artisans, and manage all your home needs with guaranteed escrow protection.

Access your dashboard here:
${baseUrl}/dashboard

Support & Inquiries:
Email: wheelofcomfort@gmail.com
Web: ${baseUrl}
Location: Lagos, Nigeria

© ${new Date().getFullYear()} Wheel of Comfort Technologies. All rights reserved.
`;
};

// ═════════════════════════════════════════════════════════════════════════════
// 2. APPROVAL EMAIL
// ═════════════════════════════════════════════════════════════════════════════

export const approvalEmailTemplate = (name: string) => {
  const baseUrl = getAppBaseUrl();
  const content = `
    <p style="font-size: 16px; color: #0F172A; margin: 0 0 16px 0;">Hello <strong>${name}</strong>,</p>
    <p style="font-size: 15px; color: #334155; line-height: 1.6; margin: 0 0 16px 0;">
      Great news! Your identity and qualifications have been thoroughly verified and approved by the <strong>Wheel of Comfort</strong> compliance team.
    </p>

    <!-- Verified Badge Card -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 12px; margin: 20px 0; padding: 18px;">
      <tr>
        <td>
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td width="36" valign="top" style="font-size: 22px;">✅</td>
              <td>
                <div style="font-size: 15px; font-weight: 800; color: #065F46;">
                  Verified Service Provider Badge Activated
                </div>
                <div style="font-size: 13px; color: #047857; line-height: 1.5; margin-top: 4px;">
                  Your profile now displays the trusted green verification badge across both the <strong>Wheelhomes Web Platform</strong> and <strong>Mobile App</strong>.
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <p style="font-size: 14px; font-weight: 700; color: #0F172A; margin: 20px 0 10px 0;">Your active benefits:</p>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 16px;">
      <tr>
        <td style="font-size: 13px; color: #334155; line-line: 1.6;">
          ⚡ <strong>Job Dispatches:</strong> Instant access to real-time client requests in your area.<br>
          🛡️ <strong>Escrow Protection:</strong> Guaranteed client deposits safely locked before you begin work.<br>
          ⭐ <strong>Client Trust:</strong> Stand out to homeowners with confirmed credentials.
        </td>
      </tr>
    </table>

    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0 16px 0;">
      <tr>
        <td align="center">
          <a href="${baseUrl}/signin" style="display: inline-block; background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #FFFFFF; text-decoration: none; font-weight: 700; font-size: 14px; padding: 14px 32px; border-radius: 8px; box-shadow: 0 4px 10px rgba(4, 120, 87, 0.3);">
            Open Wheel of Comfort Dashboard &rarr;
          </a>
        </td>
      </tr>
    </table>

    <p style="font-size: 12px; color: #64748B; text-align: center; margin-top: 20px;">
      You can also open the <strong>Wheelhomes Mobile App</strong> on your phone to start accepting incoming dispatch requests.
    </p>
  `;

  return emailWrapper({
    title: 'Verification Approved',
    previewText: 'Congratulations! Your Wheel of Comfort profile is now verified and active.',
    subtitle: 'Your service provider profile is live and verified',
    badgeText: 'Profile Status: Approved & Active',
    badgeColor: 'green',
    bodyContent: content,
  });
};

export const approvalEmailText = (name: string) => {
  const baseUrl = getAppBaseUrl();
  return `
Wheel of Comfort - Verification Approved

Hello ${name},

Great news! Your identity and qualifications have been verified and approved by the Wheel of Comfort compliance team.

Your account is now fully active:
- Verified Service Provider badge activated
- Real-time job dispatches enabled
- Guaranteed escrow deposits on all jobs

Sign in to your dashboard here:
${baseUrl}/signin

Support: wheelofcomfort@gmail.com
Web: ${baseUrl}

© ${new Date().getFullYear()} Wheel of Comfort Technologies. All rights reserved.
`;
};

// ═════════════════════════════════════════════════════════════════════════════
// 3. REJECTION / CHANGE REQUIRED EMAIL
// ═════════════════════════════════════════════════════════════════════════════

export const rejectionEmailTemplate = (name: string, reason: string) => {
  const baseUrl = getAppBaseUrl();
  const content = `
    <p style="font-size: 16px; color: #0F172A; margin: 0 0 16px 0;">Hello <strong>${name}</strong>,</p>
    <p style="font-size: 15px; color: #334155; line-height: 1.6; margin: 0 0 16px 0;">
      Thank you for submitting your verification details to <strong>Wheel of Comfort</strong>. Our compliance team reviewed your submission and identified an issue that requires your attention before we can activate your account.
    </p>

    <!-- Feedback Notice Box -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FEF2F2; border-left: 4px solid #DC2626; border-radius: 8px; margin: 20px 0; padding: 18px;">
      <tr>
        <td>
          <div style="font-size: 12px; font-weight: 700; color: #991B1B; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">
            Feedback from Compliance Team
          </div>
          <div style="font-size: 14px; color: #B91C1C; line-height: 1.5; font-weight: 600;">
            "${reason}"
          </div>
        </td>
      </tr>
    </table>

    <p style="font-size: 14px; font-weight: 700; color: #0F172A; margin: 20px 0 8px 0;">Next Steps to Complete Verification:</p>
    <ol style="font-size: 13px; color: #334155; line-height: 1.6; margin: 0 0 20px 0; padding-left: 20px;">
      <li>Log in to your Wheel of Comfort account on web or mobile.</li>
      <li>Navigate to <strong>Settings &rarr; Verification</strong>.</li>
      <li>Upload clear, legible photos of the requested document according to the feedback above.</li>
    </ol>

    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 24px 0 16px 0;">
      <tr>
        <td align="center">
          <a href="${baseUrl}/settings/verification" style="display: inline-block; background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%); color: #FFFFFF; text-decoration: none; font-weight: 700; font-size: 14px; padding: 14px 32px; border-radius: 8px; box-shadow: 0 4px 10px rgba(220, 38, 38, 0.3);">
            Update Verification Documents &rarr;
          </a>
        </td>
      </tr>
    </table>

    <p style="font-size: 12px; color: #64748B; text-align: center; margin-top: 20px;">
      If you have questions regarding this feedback, reply directly to this email or reach us at <a href="mailto:wheelofcomfort@gmail.com" style="color: #0284C7;">wheelofcomfort@gmail.com</a>.
    </p>
  `;

  return emailWrapper({
    title: 'Verification Action Required',
    previewText: 'Action Required: Your Wheel of Comfort verification documents require an update.',
    subtitle: 'Please review the compliance notes and re-upload',
    badgeText: 'Status: Changes Required',
    badgeColor: 'red',
    bodyContent: content,
  });
};

export const rejectionEmailText = (name: string, reason: string) => {
  const baseUrl = getAppBaseUrl();
  return `
Wheel of Comfort - Verification Action Required

Hello ${name},

Thank you for submitting your verification details to Wheel of Comfort.
Our compliance team reviewed your submission and noted an issue requiring your attention:

Compliance Team Feedback:
"${reason}"

Next Steps:
Please visit your Verification page to re-upload clear photos of the requested document:
${baseUrl}/settings/verification

Questions? Contact: wheelofcomfort@gmail.com

© ${new Date().getFullYear()} Wheel of Comfort Technologies. All rights reserved.
`;
};

// ═════════════════════════════════════════════════════════════════════════════
// 4. PENDING REVIEW EMAIL (SUCCESSFUL ONBOARDING - UNDER REVIEW)
// ═════════════════════════════════════════════════════════════════════════════

export const pendingReviewEmailTemplate = (name: string) => {
  const baseUrl = getAppBaseUrl();
  const content = `
    <p style="font-size: 16px; color: #0F172A; margin: 0 0 16px 0;">Hello <strong>${name}</strong>,</p>
    <p style="font-size: 15px; color: #334155; line-height: 1.6; margin: 0 0 16px 0;">
      Congratulations! Your onboarding documents have been successfully submitted to <strong>Wheel of Comfort</strong>. We have securely received your verification information.
    </p>

    <!-- Prominent Status Banner -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FEF3C7; border: 1px solid #FCD34D; border-left: 5px solid #D97706; border-radius: 10px; margin: 20px 0;">
      <tr>
        <td style="padding: 16px 18px;">
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td width="30" valign="top" style="font-size: 20px; line-height: 1;">⏱️</td>
              <td>
                <div style="font-size: 15px; font-weight: 800; color: #92400E; margin-bottom: 4px;">
                  Account Status: Under Pending Review
                </div>
                <div style="font-size: 13px; color: #78350F; line-height: 1.5;">
                  Your submission has been queued for review by our compliance team. You do not need to take any additional action at this time.
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Review Timeline Card -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; margin: 20px 0; padding: 18px;">
      <tr>
        <td>
          <div style="font-size: 13px; font-weight: 700; color: #0F172A; margin-bottom: 12px;">
            What happens next:
          </div>
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td width="28" valign="top" style="font-size: 16px;">1️⃣</td>
              <td style="font-size: 13px; color: #334155; line-height: 1.5;">
                <strong style="color: #0F172A;">Compliance Check:</strong> Our verification officers review all submissions within <strong>24 to 48 hours</strong>.
              </td>
            </tr>
            <tr><td height="10"></td></tr>
            <tr>
              <td width="28" valign="top" style="font-size: 16px;">2️⃣</td>
              <td style="font-size: 13px; color: #334155; line-height: 1.5;">
                <strong style="color: #0F172A;">Instant Notification:</strong> As soon as an admin approves your profile, you will receive an approval email and mobile push alert.
              </td>
            </tr>
            <tr><td height="10"></td></tr>
            <tr>
              <td width="28" valign="top" style="font-size: 16px;">3️⃣</td>
              <td style="font-size: 13px; color: #334155; line-height: 1.5;">
                <strong style="color: #0F172A;">Immediate Access:</strong> Once active, you can receive live client service requests, list properties, and access secure escrow payouts.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0 16px 0;">
      <tr>
        <td align="center">
          <a href="${baseUrl}/dashboard/pending" style="display: inline-block; background: linear-gradient(135deg, #0284C7 0%, #0369A1 100%); color: #FFFFFF; text-decoration: none; font-weight: 700; font-size: 14px; padding: 14px 32px; border-radius: 8px; box-shadow: 0 4px 10px rgba(2, 132, 199, 0.3);">
            Check Application Status &rarr;
          </a>
        </td>
      </tr>
    </table>

    <p style="font-size: 12px; color: #64748B; text-align: center; margin-top: 20px;">
      No further action is required from you right now. If additional information is needed, our compliance team will notify you directly.
    </p>
  `;

  return emailWrapper({
    title: 'Onboarding Successful 🎉',
    previewText: 'Successful Onboarding: Your Wheel of Comfort account is currently under pending review.',
    subtitle: 'Your Account is Under Pending Review',
    badgeText: 'Status: Pending Review',
    badgeColor: 'amber',
    bodyContent: content,
  });
};

export const pendingReviewEmailText = (name: string) => {
  const baseUrl = getAppBaseUrl();
  return `
Wheel of Comfort - Successful Onboarding (Account Under Review)

Hello ${name},

Congratulations! Your onboarding documents have been successfully submitted to Wheel of Comfort.

Current Status: Under Pending Review
Review Timeline: Within 24 to 48 hours

What happens next:
1. Compliance Check: Our verification team is reviewing your documents (typically within 24 to 48 hours).
2. Approval Notification: As soon as an admin approves your profile, you will receive an approval email and mobile alert.
3. Immediate Access: Once active, you can start accepting client requests and booking services immediately.

Track your application status:
${baseUrl}/dashboard/pending

Support: wheelofcomfort@gmail.com
Web: ${baseUrl}

© ${new Date().getFullYear()} Wheel of Comfort Technologies. All rights reserved.
`;
};

// ═════════════════════════════════════════════════════════════════════════════
// 5. PASSWORD RESET EMAIL
// ═════════════════════════════════════════════════════════════════════════════

export const passwordResetEmailTemplate = (otp: string) => {
  const content = `
    <p style="font-size: 16px; color: #0F172A; margin: 0 0 16px 0;">Hello,</p>
    <p style="font-size: 15px; color: #334155; line-height: 1.6; margin: 0 0 16px 0;">
      We received a request to reset your password for your <strong>Wheel of Comfort</strong> account. Use the one-time verification code below to complete the process:
    </p>

    <!-- OTP Code Display -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 24px 0;">
      <tr>
        <td align="center">
          <div style="display: inline-block; background-color: #F8FAFC; border: 2px dashed #0284C7; border-radius: 12px; padding: 16px 36px;">
            <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #0F172A; font-family: Courier, monospace;">
              ${otp}
            </span>
          </div>
        </td>
      </tr>
    </table>

    <p style="font-size: 13px; color: #64748B; text-align: center; margin: 0 0 16px 0;">
      ⏱️ This code will expire in <strong>15 minutes</strong>.
    </p>

    <p style="font-size: 12px; color: #94A3B8; text-align: center; margin-top: 24px;">
      If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.
    </p>
  `;

  return emailWrapper({
    title: 'Password Reset Request',
    previewText: `Your Wheel of Comfort password reset code is ${otp}. Expires in 15 minutes.`,
    subtitle: 'One-time security verification code',
    badgeText: 'Security Verification',
    badgeColor: 'blue',
    bodyContent: content,
  });
};

export const passwordResetEmailText = (otp: string) => {
  const baseUrl = getAppBaseUrl();
  return `
Wheel of Comfort - Password Reset Request

Hello,

We received a request to reset your password for your Wheel of Comfort account.
Use the verification code below:

Verification Code: ${otp}

This code will expire in 15 minutes.
If you did not request this, you can safely ignore this email.

Support: wheelofcomfort@gmail.com
Web: ${baseUrl}

© ${new Date().getFullYear()} Wheel of Comfort Technologies. All rights reserved.
`;
};



