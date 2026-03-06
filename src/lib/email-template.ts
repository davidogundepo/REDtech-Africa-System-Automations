/**
 * Beautiful branded email template for REDtech Africa System Automations.
 * Wraps email content in a professional, elegant HTML template.
 */

export const brandedEmailTemplate = ({
  recipientName,
  heading,
  body,
  ctaText,
  ctaUrl,
  footerNote,
}: {
  recipientName?: string;
  heading: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
  footerNote?: string;
}) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${heading}</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f1ec; font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f1ec; padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #bc7e57 0%, #1a1a2e 100%); padding:36px 40px; text-align:center;">
              <h1 style="margin:0; color:#ffffff; font-size:22px; font-weight:700; letter-spacing:0.5px;">
                ⚙️ RAC System Automations
              </h1>
              <p style="margin:6px 0 0; color:rgba(255,255,255,0.75); font-size:13px; letter-spacing:0.3px;">
                REDtech Africa Consulting
              </p>
            </td>
          </tr>
          
          <!-- Body Content -->
          <tr>
            <td style="padding:36px 40px 24px;">
              ${recipientName ? `<p style="margin:0 0 20px; color:#555; font-size:15px;">Hi <strong style="color:#1a1a2e;">${recipientName}</strong>,</p>` : ''}
              
              <h2 style="margin:0 0 16px; color:#1a1a2e; font-size:20px; font-weight:700;">
                ${heading}
              </h2>
              
              <div style="color:#444; font-size:15px; line-height:1.7;">
                ${body}
              </div>
              
              ${ctaText && ctaUrl ? `
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0 8px;">
                <tr>
                  <td style="border-radius:8px; background-color:#bc7e57;">
                    <a href="${ctaUrl}" target="_blank" style="display:inline-block; padding:14px 32px; color:#ffffff; font-size:15px; font-weight:600; text-decoration:none; letter-spacing:0.3px;">
                      ${ctaText} →
                    </a>
                  </td>
                </tr>
              </table>
              ` : ''}
            </td>
          </tr>
          
          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <hr style="border:none; border-top:1px solid #eee; margin:0;">
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px 32px;">
              ${footerNote ? `<p style="margin:0 0 16px; color:#888; font-size:13px; line-height:1.6;">${footerNote}</p>` : ''}
              <p style="margin:0; color:#aaa; font-size:12px; line-height:1.5;">
                This is an automated notification from <strong style="color:#bc7e57;">REDtech Africa Consulting</strong>.<br>
                © ${new Date().getFullYear()} REDtech Africa Consulting LTD. All rights reserved.
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
