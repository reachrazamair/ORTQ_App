import { LOGO_URL } from './constants.ts';

export interface BaseTemplateOptions {
  title: string;
  heading: string;
  content: string;
  buttonText?: string;
  buttonLink?: string;
  footerText?: string;
}

export function generateBaseTemplate(options: BaseTemplateOptions): string {
  const { title, heading, content, buttonText, buttonLink, footerText } = options;
  const buttonHTML =
    buttonText && buttonLink
      ? `
      <tr>
        <td align="center" style="padding:30px 0;">
          <a href="${buttonLink}"
             style="background-color:#F27620; color:#FFF3E1; text-decoration:none; font-weight:600; font-size:16px; padding:14px 28px; border-radius:8px; display:inline-block;">
            ${buttonText}
          </a>
        </td>
      </tr>
      ${
        buttonLink
          ? `
      <tr>
        <td style="text-align:center; padding:10px 0 24px;">
          <p style="font-size:14px; color:#2F272A; margin:0 0 8px;">
            If the button doesn't work, copy and paste this link into your browser:
          </p>
          <a href="${buttonLink}"
             style="font-size:13px; color:#556B2F; word-break:break-all; text-decoration:underline;">
            ${buttonLink}
          </a>
        </td>
      </tr>
      `
          : ''
      }
    `
      : '';

  const footerHTML = footerText
    ? `
      <tr>
        <td style="text-align:center; padding:20px 0;">
          ${footerText}
        </td>
      </tr>
    `
    : '';

  return `
    <!DOCTYPE html>
    <html lang="en" style="margin:0; padding:0; background-color:#FFF3E1;">
      <head>
        <meta charset="UTF-8" />
        <meta name="color-scheme" content="light" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${title} | Off-Road Treasure Quest</title>
      </head>
      <body style="margin:0; padding:0; background-color:#FFF3E1; font-family:Arial, Helvetica, sans-serif; color:#2F272A;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:#FFF3E1; padding:40px 0;">
          <tr>
            <td align="center">
              <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="background-color:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.08); padding:40px;">
                <tr>
                  <td align="center" style="padding-bottom:30px;">
                    <img src="${LOGO_URL}" alt="Off-Road Treasure Quest" width="120" style="display:block; margin:0 auto 16px;" />
                    <h1 style="font-size:24px; color:#F27620; margin:0; font-weight:700;">
                      Off-Road Treasure Quest
                    </h1>
                  </td>
                </tr>
                <tr>
                  <td style="text-align:center; padding-bottom:24px;">
                    <h2 style="font-size:22px; color:#2F272A; margin-bottom:12px;">${heading}</h2>
                    ${content}
                  </td>
                </tr>
                ${buttonHTML}
                ${footerHTML}
                <tr>
                  <td align="center" style="border-top:1px solid #F6B223; padding-top:16px; font-size:13px; color:#2F272A;">
                    <p style="margin:4px 0;">Safe travels and happy questing!</p>
                    <p style="margin:0; font-weight:bold;">The Off-Road Treasure Quest Team</p>
                    <p style="margin:8px 0 0; font-size:12px; color:#2F272A;">© 2025 Adventure Bound Software LLC</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}
