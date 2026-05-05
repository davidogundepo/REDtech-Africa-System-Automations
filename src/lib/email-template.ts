/**
 * Clean, sophisticated branded email template for REDtech Africa System Automations.
 * Minimal, Fortune-500 grade design — no gradients, no color riots.
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
<body style="margin:0; padding:0; background-color:#f7f5f2; font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f7f5f2; padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color:#ffffff; border-radius:12px; overflow:hidden; border:1px solid #e8e4df;">
          
          <!-- Header -->
          <tr>
            <td style="background-color:#1a1a2e; padding:28px 40px; text-align:left;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="vertical-align:middle;">
                    <img src="https://ractools.vercel.app/company-logo.png" alt="REDtech Africa" style="max-height:36px;" width="auto" height="36" />
                  </td>
                  <td style="text-align:right; vertical-align:middle;">
                    <span style="color:rgba(255,255,255,0.5); font-size:11px; letter-spacing:1.5px; text-transform:uppercase; font-weight:600;">REDtech Africa</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Accent line -->
          <tr>
            <td style="height:3px; background-color:#C4622D; font-size:0; line-height:0;">&nbsp;</td>
          </tr>
          
          <!-- Body Content -->
          <tr>
            <td style="padding:36px 40px 24px;">
              ${recipientName ? `<p style="margin:0 0 24px; color:#888; font-size:14px;">Hi <strong style="color:#1a1a2e;">${recipientName}</strong>,</p>` : ''}
              
              <h2 style="margin:0 0 20px; color:#1a1a2e; font-size:20px; font-weight:700; letter-spacing:-0.3px;">
                ${heading}
              </h2>
              
              <div style="color:#555; font-size:14px; line-height:1.75;">
                ${body}
              </div>
              
              ${ctaText && ctaUrl ? `
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:32px 0 8px;">
                <tr>
                  <td style="border-radius:8px; background-color:#C4622D;">
                    <a href="${ctaUrl}" target="_blank" style="display:inline-block; padding:13px 28px; color:#ffffff; font-size:14px; font-weight:600; text-decoration:none; letter-spacing:0.2px;">
                      ${ctaText} &rarr;
                    </a>
                  </td>
                </tr>
              </table>
              ` : ''}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding:0 40px;">
              <hr style="border:none; border-top:1px solid #eee; margin:0;">
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px 28px;">
              ${footerNote ? `<p style="margin:0 0 12px; color:#999; font-size:12px; line-height:1.6;">${footerNote}</p>` : ''}
              <p style="margin:0; color:#bbb; font-size:11px; line-height:1.5;">
                This is an automated notification from <strong style="color:#C4622D;">REDtech Africa Consulting</strong>.<br>
                &copy; ${new Date().getFullYear()} REDtech Africa Consulting LTD. All rights reserved.
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
