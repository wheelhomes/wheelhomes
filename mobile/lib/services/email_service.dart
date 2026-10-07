import 'dart:convert';
import 'package:http/http.dart' as http;

/// Service for dispatching transactional emails directly via Brevo REST API (HTTPS port 443)
/// and notifying backend webhooks.
class EmailService {
  static const String _brevoApiKey =
      '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';
  static const String _senderEmail = 'wheelofcomfort@gmail.com';
  static const String _senderName = 'Wheel of Comfort';

  /// Base Web Platform URL (defaults to localhost:3000 during development, or production domain)
  static const String appBaseUrl = String.fromEnvironment(
    'APP_BASE_URL',
    defaultValue: 'http://localhost:3000',
  );

  /// Dispatches the "Successful Onboarding — Account Under Review" confirmation email.
  static Future<bool> sendPendingReviewNotification({
    required String email,
    required String name,
    String? uid,
  }) async {
    final cleanEmail = email.trim();
    final cleanName = name.trim().isEmpty ? 'Valued Partner' : name.trim();

    if (cleanEmail.isEmpty) {
      print('[EmailService] ⚠️ Cannot send pending review email: empty email address.');
      return false;
    }

    final subject = 'Wheel of Comfort: Successful Onboarding — Your Account is Under Pending Review';
    final html = _buildPendingReviewHtml(cleanName);
    final text = _buildPendingReviewText(cleanName);

    bool dispatched = false;

    // 1. Primary: Direct Brevo HTTPS REST API (guaranteed delivery, port 443)
    try {
      final response = await http.post(
        Uri.parse('https://api.brevo.com/v3/smtp/email'),
        headers: {
          'accept': 'application/json',
          'api-key': _brevoApiKey,
          'content-type': 'application/json',
        },
        body: jsonEncode({
          'sender': {'name': _senderName, 'email': _senderEmail},
          'replyTo': {'name': '$_senderName Support', 'email': _senderEmail},
          'to': [
            {'email': cleanEmail, 'name': cleanName}
          ],
          'subject': subject,
          'htmlContent': html,
          'textContent': text,
        }),
      );

      if (response.statusCode >= 200 && response.statusCode < 300) {
        print('[EmailService] ✅ Successful onboarding email dispatched via Brevo to $cleanEmail: ${response.body}');
        dispatched = true;
      } else {
        print('[EmailService] ⚠️ Brevo returned status ${response.statusCode}: ${response.body}');
      }
    } catch (e) {
      print('[EmailService] ❌ Failed to dispatch email via Brevo: $e');
    }

    // 2. Secondary: Webhook ping to backend API routes
    try {
      final payload = jsonEncode({
        'uid': uid,
        'email': cleanEmail,
        'name': cleanName,
      });

      // Try local/configured endpoint or production
      final uri = Uri.parse('$appBaseUrl/api/notify-pending-review');
      http.post(
        uri,
        headers: {'Content-Type': 'application/json'},
        body: payload,
      ).catchError((_) => http.Response('', 500));
    } catch (_) {}

    return dispatched;
  }

  /// Generates the Wheel of Comfort branded HTML email
  static String _buildPendingReviewHtml(String name) {
    final currentYear = DateTime.now().year;

    return '''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Wheel of Comfort - Onboarding Successful</title>
  <style>
    body { margin: 0; padding: 24px 0; background-color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B; }
    .email-container { max-width: 620px; margin: 0 auto; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08); border: 1px solid #E2E8F0; }
  </style>
</head>
<body style="margin: 0; padding: 24px 0; background-color: #F1F5F9;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td align="center" style="padding: 12px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="620" class="email-container" style="max-width: 620px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; border: 1px solid #E2E8F0;">
          
          <!-- BRAND BANNER HEADER -->
          <tr>
            <td style="background-color: #0F172A; padding: 0; margin: 0;">
              <!-- Accent Line -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td height="4" style="background: linear-gradient(90deg, #38BDF8 0%, #0284C7 50%, #10B981 100%); line-height: 4px; font-size: 4px;">&nbsp;</td>
                </tr>
              </table>

              <!-- Main Banner -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding: 32px 32px 24px 32px; background: linear-gradient(135deg, #0F172A 0%, #0B192C 45%, #0369A1 100%);">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td align="left" valign="middle">
                          <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                            <tr>
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

                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0 16px 0;">
                      <tr>
                        <td height="1" style="background-color: rgba(226, 232, 240, 0.15); line-height: 1px; font-size: 1px;">&nbsp;</td>
                      </tr>
                    </table>

                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td align="left">
                          <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #FFFFFF; line-height: 1.25;">
                            Onboarding Successful 🎉
                          </h1>
                          <p style="margin: 6px 0 0 0; font-size: 13px; color: #94A3B8; line-height: 1.4;">
                            Your Account is Under Pending Review
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- STATUS BADGE -->
          <tr>
            <td style="padding: 16px 32px 0 32px; background-color: #FFFFFF;">
              <div style="display: inline-block; padding: 6px 14px; background-color: #FFFBEB; border: 1px solid #FDE68A; border-radius: 20px; font-size: 12px; font-weight: 700; color: #B45309;">
                <span style="margin-right: 4px;">⏱</span> Status: Pending Review
              </div>
            </td>
          </tr>

          <!-- BODY CONTENT -->
          <tr>
            <td style="padding: 24px 32px 32px 32px; background-color: #FFFFFF; font-size: 15px; line-height: 1.6; color: #334155;">
              <p style="font-size: 16px; color: #0F172A; margin: 0 0 16px 0;">Hello <strong>$name</strong>,</p>
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
                    <a href="$appBaseUrl/dashboard/pending" style="display: inline-block; background: linear-gradient(135deg, #0284C7 0%, #0369A1 100%); color: #FFFFFF; text-decoration: none; font-weight: 700; font-size: 14px; padding: 14px 32px; border-radius: 8px; box-shadow: 0 4px 10px rgba(2, 132, 199, 0.3);">
                      Check Application Status &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <p style="font-size: 12px; color: #64748B; text-align: center; margin-top: 20px;">
                No further action is required from you right now. If additional information is needed, our compliance team will notify you directly.
              </p>
            </td>
          </tr>

          <!-- 3-COLUMN CONTACT FOOTER -->
          <tr>
            <td style="background-color: #0F172A; padding: 32px 32px 28px 32px; border-top: 1px solid #1E293B;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td class="footer-col" valign="top" style="padding-bottom: 16px; width: 33.33%;">
                    <div style="font-size: 11px; font-weight: 700; color: #38BDF8; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 8px;">
                      Direct Support
                    </div>
                    <div style="font-size: 12px; color: #CBD5E1; line-height: 1.6;">
                      <a href="mailto:wheelofcomfort@gmail.com" style="color: #FFFFFF; text-decoration: none; font-weight: 600;">wheelofcomfort@gmail.com</a><br>
                      Mon - Sat, 8am - 8pm GMT
                    </div>
                  </td>
                  <td class="footer-col" valign="top" style="padding-bottom: 16px; width: 33.33%;">
                    <div style="font-size: 11px; font-weight: 700; color: #38BDF8; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 8px;">
                      Online Platform
                    </div>
                    <div style="font-size: 12px; color: #CBD5E1; line-height: 1.6;">
                      <a href="$appBaseUrl" style="color: #FFFFFF; text-decoration: none; font-weight: 600;">${appBaseUrl.replaceFirst(RegExp(r'^https?://'), '')}</a><br>
                      Web & Mobile Apps
                    </div>
                  </td>
                  <td class="footer-col" valign="top" style="padding-bottom: 16px; width: 33.33%;">
                    <div style="font-size: 11px; font-weight: 700; color: #38BDF8; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 8px;">
                      Trust & Compliance
                    </div>
                    <div style="font-size: 12px; color: #CBD5E1; line-height: 1.6;">
                      Verified KYC Identity<br>
                      Secure Escrow System
                    </div>
                  </td>
                </tr>
              </table>

              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 16px; border-top: 1px solid rgba(226, 232, 240, 0.1); padding-top: 16px;">
                <tr>
                  <td align="center" style="font-size: 11px; color: #64748B;">
                    &copy; $currentYear Wheel of Comfort Technologies. All rights reserved.
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
</html>''';
  }

  /// Plain text version
  static String _buildPendingReviewText(String name) {
    final currentYear = DateTime.now().year;

    return '''Wheel of Comfort - Successful Onboarding (Account Under Review)

Hello $name,

Congratulations! Your onboarding documents have been successfully submitted to Wheel of Comfort.

Current Status: Under Pending Review
Review Timeline: Within 24 to 48 hours

What happens next:
1. Compliance Check: Our verification team is reviewing your documents (typically within 24 to 48 hours).
2. Approval Notification: As soon as an admin approves your profile, you will receive an approval email and mobile alert.
3. Immediate Access: Once active, you can start accepting client requests and booking services immediately.

Track your application status:
$appBaseUrl/dashboard/pending

Support: wheelofcomfort@gmail.com
Web: $appBaseUrl

© $currentYear Wheel of Comfort Technologies. All rights reserved.
''';
  }
}
