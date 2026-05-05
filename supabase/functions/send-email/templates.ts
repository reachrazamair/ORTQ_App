import { generateBaseTemplate } from './base-template.ts';
import { LOGO_URL } from './constants.ts';

export function generateEmailHTML(templateType: string, data: Record<string, any>): string {
  switch (templateType) {
    case 'group_invitation':
      return generateBaseTemplate({
        title: 'Group Invitation',
        heading: "You've Been Invited!",
        content: `
          <p style="font-size:16px; color:#2F272A; margin:0;">
            <strong>${data.inviterName}</strong> has invited you to join the group <strong>"${data.groupName}"</strong>.
          </p>
          ${
            data.groupDescription
              ? `
            <p style="font-size:16px; color:#2F272A; margin:16px 0 0; padding:15px; background-color:#FFF3E1; border-radius:8px;">
              ${data.groupDescription}
            </p>
          `
              : ''
          }
          <p style="font-size:16px; color:#2F272A; margin:16px 0 0;">
            If you do not have an off-road treasure quest account, you can join for free.
          </p>
        `,
        buttonText: 'Accept Invitation',
        buttonLink: data.invitationLink,
      });

    case 'group_join_request':
      return generateBaseTemplate({
        title: 'Group Join Request',
        heading: 'New Join Request',
        content: `
          <p style="font-size:16px; color:#2F272A; margin:0;">
            <strong>${data.requesterName}</strong> (${data.requesterEmail}) wants to join your group <strong>"${data.groupName}"</strong>.
          </p>
          ${
            data.groupDescription
              ? `
            <p style="font-size:16px; color:#2F272A; margin:16px 0 0; padding:15px; background-color:#FFF3E1; border-radius:8px;">
              ${data.groupDescription}
            </p>
          `
              : ''
          }
        `,
        buttonText: 'Review Request',
        buttonLink: data.requestLink,
      });

    case 'group_join_request_approved':
      return generateBaseTemplate({
        title: 'Request Approved',
        heading: '🎉 Request Approved!',
        content: `
          <p style="font-size:16px; color:#2F272A; margin:0;">
            Congratulations! Your request to join <strong>"${data.groupName}"</strong> has been approved.
          </p>
          ${
            data.groupDescription
              ? `
            <p style="font-size:16px; color:#2F272A; margin:16px 0 0; padding:15px; background-color:#FFF3E1; border-radius:8px;">
              ${data.groupDescription}
            </p>
          `
              : ''
          }
        `,
        buttonText: 'Go to Group',
        buttonLink: data.groupLink,
      });

    case 'group_join_request_rejected':
      return generateBaseTemplate({
        title: 'Request Rejected',
        heading: 'Request Not Approved',
        content: `
          <p style="font-size:16px; color:#2F272A; margin:0;">
            Unfortunately, your request to join <strong>"${data.groupName}"</strong> was not approved.
          </p>
          ${
            data.rejectionReason
              ? `
            <p style="font-size:16px; color:#2F272A; margin:16px 0 0; padding:15px; background-color:#FFF3E1; border-radius:8px;">
              <strong>Reason:</strong> ${data.rejectionReason}
            </p>
          `
              : ''
          }
          <p style="font-size:16px; color:#2F272A; margin:16px 0 0;">
            You can try joining other groups or submit a request again later.
          </p>
        `,
      });

    case 'welcome':
      return generateWelcomeEmailTemplate();

    case 'moderation_report':
      return generateBaseTemplate({
        title: 'Moderation Report',
        heading: data.reportType === 'block' ? 'User Block Report' : 'Content Flag Report',
        content: `
          <p style="font-size:16px; color:#2F272A; margin:0 0 12px;">
            A moderation action was taken in your app and requires your attention within 24 hours.
          </p>
          <div style="background-color:#FFF3E1; padding:16px; border-radius:8px; margin:0 0 16px;">
            <p style="font-size:14px; color:#2F272A; margin:0 0 8px;">
              <strong>Action:</strong> ${data.reportType === 'block' ? 'User Blocked' : 'Content Flagged'}
            </p>
            ${data.contentType ? `<p style="font-size:14px; color:#2F272A; margin:0 0 8px;"><strong>Content Type:</strong> ${data.contentType}</p>` : ''}
            ${data.contentId ? `<p style="font-size:14px; color:#2F272A; margin:0 0 8px;"><strong>Content ID:</strong> ${data.contentId}</p>` : ''}
            ${data.reportedUserId ? `<p style="font-size:14px; color:#2F272A; margin:0 0 8px;"><strong>Reported User ID:</strong> ${data.reportedUserId}</p>` : ''}
            <p style="font-size:14px; color:#2F272A; margin:0 0 8px;">
              <strong>Reported By (User ID):</strong> ${data.reportedByUserId}
            </p>
            <p style="font-size:14px; color:#2F272A; margin:0;">
              <strong>Timestamp:</strong> ${data.timestamp}
            </p>
          </div>
          <p style="font-size:14px; color:#2F272A; margin:0;">
            Per your Terms of Service, please review this report and take appropriate action within 24 hours.
            If the content violates community guidelines, remove it and eject the offending user from the platform.
          </p>
        `,
      });

    default:
      return '<p>Email notification</p>';
  }
}

function generateWelcomeEmailTemplate(): string {
  return `
    <!DOCTYPE html>
    <html lang="en" style="margin:0; padding:0; background-color:#FFF3E1;">
      <head>
        <meta charset="UTF-8" />
        <meta name="color-scheme" content="light" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Welcome to Off Road Treasure Quest!</title>
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
                  <td style="padding-bottom:24px;">
                    <h2 style="font-size:22px; color:#2F272A; margin:0 0 16px;">Hey there!</h2>
                    <p style="font-size:16px; color:#2F272A; line-height:24px; margin:0 0 16px;">
                      Welcome to the Off Road Treasure Quest community! We're thrilled you're ready to hit the dirt, explore hidden trails, and compete for epic prizes. Get ready to turn every weekend drive into a full-blown adventure.
                    </p>
                    <p style="font-size:16px; color:#2F272A; line-height:24px; margin:0 0 24px;">
                      Below is everything you need to know to find your first checkpoint and start racking up those points!
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom:24px;">
                    <h3 style="font-size:20px; color:#F27620; margin:0 0 16px; font-weight:600;">How to Start Your Quest</h3>
                    <p style="font-size:16px; color:#2F272A; line-height:24px; margin:0 0 16px;">
                      The app is designed to get you out exploring and making memories while keeping the thrill of the hunt alive. Here is the simple process for finding, unlocking, and conquering your first checkpoint:
                    </p>
                    <div style="background-color:#FFF3E1; padding:20px; border-radius:8px; margin:16px 0;">
                      <p style="font-size:16px; color:#2F272A; line-height:24px; margin:0 0 12px;">
                        <strong style="color:#F27620;">1. Explore for Potential Trails</strong><br>
                        After completing your profile, head to the Explore page. You'll see potential hidden checkpoints sorted by what's closest to your current location. You can also filter by location if you have a specific region in mind.
                      </p>
                      <p style="font-size:16px; color:#2F272A; line-height:24px; margin:12px 0;">
                        To make a decision, click the "Show More" link on any trail card. We provide key, non-spoiler details:
                      </p>
                      <ul style="font-size:16px; color:#2F272A; line-height:24px; margin:12px 0; padding-left:20px;">
                        <li>Level of difficulty</li>
                        <li>Experiences you will encounter (e.g., water crossings, scenic views, historical sites)</li>
                        <li>A general trail description</li>
                      </ul>
                      <p style="font-size:16px; color:#2F272A; line-height:24px; margin:12px 0 0;">
                        We never reveal the trail name or exact location at this stage—that's the fun!
                      </p>
                    </div>
                    <div style="background-color:#FFF3E1; padding:20px; border-radius:8px; margin:16px 0;">
                      <p style="font-size:16px; color:#2F272A; line-height:24px; margin:0 0 12px;">
                        <strong style="color:#F27620;">2. Unlock & Navigate</strong><br>
                        Once you've decided on a trail, you can unlock the trail card. This action immediately gives you the exact coordinates of the hidden checkpoint, additional trail information, and a navigational description.
                      </p>
                      <p style="font-size:16px; color:#2F272A; line-height:24px; margin:12px 0 0;">
                        Load these coordinates into your favorite navigation app (like Gaia GPS, Google Maps, Trails Offroad, OnX Offroad, No Roads, or your vehicle's built-in system) to plan your route and get started.
                      </p>
                    </div>
                    <div style="background-color:#FFF3E1; padding:20px; border-radius:8px; margin:16px 0;">
                      <p style="font-size:16px; color:#2F272A; line-height:24px; margin:0 0 12px;">
                        <strong style="color:#F27620;">3. Verify & Score Points</strong><br>
                        Once you reach the destination, open the Off Road Treasure Quest app (in your browser or mobile app). You can use the app to verify your location and confirm your triumphant arrival. You will instantly receive your points and an additional key to unlock another trail.
                      </p>
                      <p style="font-size:16px; color:#F27620; line-height:24px; margin:12px 0 0; font-weight:600;">
                        Pro Tip: Planning a weekend trip? We recommend you unlock multiple trails to plan an efficient route and visit several checkpoints in a single outing! Here is a video of how I plan my routes. <a href="https://ORTQ.screencasthost.com/channels/cOVqq5VTuS" style="color:#F27620; text-decoration:underline; font-weight:600;">Video Link</a>
                      </p>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom:24px;">
                    <h3 style="font-size:20px; color:#F27620; margin:0 0 16px; font-weight:600;">Climb the Leaderboard & Earn Rewards</h3>
                    <p style="font-size:16px; color:#2F272A; line-height:24px; margin:0 0 16px;">
                      Keep hunting year-round to climb the leaderboard! Reaching these milestone levels not only proves your mastery but also qualifies you for incredible prizes:
                    </p>
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse; margin:16px 0;">
                      <tr style="background-color:#F27620; color:#FFF3E1;">
                        <th style="padding:12px; text-align:left; font-size:16px; font-weight:600;">Rank</th>
                        <th style="padding:12px; text-align:left; font-size:16px; font-weight:600;">Points</th>
                        <th style="padding:12px; text-align:left; font-size:16px; font-weight:600;">Reward</th>
                      </tr>
                      <tr style="background-color:#FFF3E1;">
                        <td style="padding:12px; font-size:16px; color:#2F272A; font-weight:600;">Explorer</td>
                        <td style="padding:12px; font-size:16px; color:#2F272A;">1500 Points</td>
                        <td style="padding:12px; font-size:16px; color:#2F272A;">Guaranteed qualification for the year-end Treasure Hunt!</td>
                      </tr>
                      <tr style="background-color:#ffffff;">
                        <td style="padding:12px; font-size:16px; color:#2F272A; font-weight:600;">Trailblazer</td>
                        <td style="padding:12px; font-size:16px; color:#2F272A;">2000 Points</td>
                        <td style="padding:12px; font-size:16px; color:#2F272A;">Exclusive SWAG and gear sent right to you.</td>
                      </tr>
                      <tr style="background-color:#FFF3E1;">
                        <td style="padding:12px; font-size:16px; color:#2F272A; font-weight:600;">Conqueror</td>
                        <td style="padding:12px; font-size:16px; color:#2F272A;">2500 Points</td>
                        <td style="padding:12px; font-size:16px; color:#2F272A;">Next year's Quest for Free plus ultimate bragging rights with your friends and club mates!</td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom:24px; text-align:center;">
                    <p style="font-size:16px; color:#2F272A; line-height:24px; margin:0 0 16px;">
                      We're here to help you get started. Check out our video walkthrough.
                    </p>
                    <p style="font-size:16px; color:#2F272A; line-height:24px; margin:0;">
                      <strong><a href="https://ORTQ.screencasthost.com/channels/cOVqq5VTuS" style="color:#F27620; text-decoration:underline;">How-To Video Library:</a></strong>
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom:16px; text-align:center;">
                    <p style="margin:0 0 8px; font-size:16px; font-weight:600; color:#2F272A;">Good luck, and happy trails!</p>
                    <p style="margin:0; font-weight:bold; color:#2F272A;">The Off Road Treasure Quest Team</p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="border-top:1px solid #F6B223; padding-top:16px; font-size:12px; color:#2F272A;">
                    <p style="margin:0;">© 2025 Adventure Bound Software LLC</p>
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
