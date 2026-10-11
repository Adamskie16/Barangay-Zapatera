// supabase/functions/send-pickup-email/template.ts

export interface PickupEmailData {
  residentName: string;
  residentEmail: string;
  documentTitle: string;
  trackingNumber: string;
  pickupDate: string;
  pickupTimeSlot: string;
  pickupLocation: string;
  pickupInstructions?: string;
  fee?: number | string;
  isPaid?: boolean;
  barangayName?: string;
  barangayAddress?: string;
  barangayContact?: string;
  operatingHours?: string;
}

/**
 * Generates an executive, mobile-responsive HTML email template with inline CSS
 * for maximum cross-client compatibility (Gmail, Outlook, Apple Mail, Yahoo).
 */
export function generatePickupEmailHtml(data: PickupEmailData): string {
  const barangayName = data.barangayName || 'BARANGAY ZAPATERA';
  const barangayAddress = data.barangayAddress || 'Barangay Hall, Rahmann St., Zapatera, Cebu City, Philippines 6000';
  const barangayContact = data.barangayContact || '(032) 254-8721 / zapatera.cebucity@gmail.com';
  const operatingHours = data.operatingHours || 'Monday to Friday: 8:00 AM – 5:00 PM';
  const location = data.pickupLocation || 'Express Window 2, Barangay Hall Lobby, Rahmann St.';
  const instructions = data.pickupInstructions || 'Please proceed to Express Window 2 upon arrival and present your tracking reference number to the barangay staff on duty.';
  const feeDisplay = typeof data.fee === 'number'
    ? (data.fee > 0 ? `₱${data.fee.toFixed(2)}` : 'FREE OF CHARGE')
    : (data.fee || 'FREE OF CHARGE');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Document is Ready for Pickup - ${barangayName}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td, p, a, li, blockquote { font-family: Arial, Helvetica, sans-serif !important; }
  </style>
  <![endif]-->
  <style type="text/css">
    body {
      margin: 0;
      padding: 0;
      background-color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    table {
      border-collapse: separate;
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    img {
      border: 0;
      outline: none;
      text-decoration: none;
      -ms-interpolation-mode: bicubic;
    }
    @media only screen and (max-width: 620px) {
      .email-container {
        width: 100% !important;
        max-width: 100% !important;
      }
      .responsive-padding {
        padding: 20px 16px !important;
      }
      .details-grid td {
        display: block !important;
        width: 100% !important;
        padding-left: 0 !important;
        padding-right: 0 !important;
      }
      .tracking-box {
        font-size: 15px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; color: #1e293b;">

  <!-- Background Wrapper -->
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9; padding: 24px 8px;">
    <tr>
      <td align="center">

        <!-- Main Card Container (Max 600px) -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" class="email-container" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
          
          <!-- TOP BRANDED HEADER -->
          <tr>
            <td style="background-color: #0f172a; padding: 32px 28px; text-align: center; border-bottom: 3px solid #2563eb;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <!-- Barangay Badge Icon -->
                    <div style="display: inline-block; background-color: #1e293b; border: 1px solid #334155; border-radius: 50%; width: 56px; height: 56px; line-height: 56px; text-align: center; margin-bottom: 12px;">
                      <span style="font-size: 26px;">🏛️</span>
                    </div>
                    <h1 style="margin: 0; font-size: 18px; font-weight: 800; color: #ffffff; letter-spacing: 1px; text-transform: uppercase;">
                      ${barangayName}
                    </h1>
                    <p style="margin: 4px 0 0 0; font-size: 12px; color: #94a3b8; font-weight: 500; letter-spacing: 0.5px;">
                      Republic of the Philippines • City of Cebu • Office of the Punong Barangay
                    </p>
                    <div style="margin-top: 14px;">
                      <span style="background-color: #059669; color: #ffffff; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; padding: 4px 12px; border-radius: 9999px; display: inline-block;">
                        ✓ Document Processing Complete
                      </span>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- MAIN BODY CONTENT -->
          <tr>
            <td class="responsive-padding" style="padding: 32px 28px;">

              <!-- Greeting & Headline -->
              <h2 style="margin: 0 0 10px 0; font-size: 20px; font-weight: 700; color: #0f172a; line-height: 1.3;">
                Maayong Adlaw, ${data.residentName}! 👋
              </h2>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                Great news! Your requested official barangay document has been successfully processed, verified, and signed. It is now <strong>officially ready for pickup</strong> at the Barangay Hall.
              </p>

              <!-- HIGHLIGHTED DOCUMENT SUMMARY CARD -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; margin-bottom: 24px; overflow: hidden;">
                
                <!-- Card Header -->
                <tr>
                  <td style="background-color: #eff6ff; border-bottom: 1px solid #bfdbfe; padding: 12px 18px;">
                    <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.75px; color: #1d4ed8;">
                      📋 Official Document Details
                    </span>
                  </td>
                </tr>

                <!-- Card Body -->
                <tr>
                  <td style="padding: 16px 18px;">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                      
                      <!-- Document Requested -->
                      <tr>
                        <td style="padding-bottom: 12px;" colspan="2">
                          <span style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: #64748b; display: block;">
                            Document Requested
                          </span>
                          <span style="font-size: 16px; font-weight: 800; color: #0f172a; display: block; margin-top: 2px;">
                            ${data.documentTitle}
                          </span>
                        </td>
                      </tr>

                      <!-- Tracking Reference Number -->
                      <tr>
                        <td style="padding-bottom: 14px;" colspan="2">
                          <span style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: #64748b; display: block;">
                            Tracking Reference Number
                          </span>
                          <div style="margin-top: 4px; display: inline-block; background-color: #0f172a; color: #38bdf8; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; font-size: 15px; font-weight: 700; padding: 6px 12px; border-radius: 6px; letter-spacing: 1px;">
                            ${data.trackingNumber}
                          </div>
                        </td>
                      </tr>

                      <!-- Pickup Date & Time Grid -->
                      <tr>
                        <td width="50%" style="padding-bottom: 12px; vertical-align: top;">
                          <span style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: #64748b; display: block;">
                            📅 Scheduled Pickup Date
                          </span>
                          <span style="font-size: 13px; font-weight: 700; color: #1e293b; display: block; margin-top: 2px;">
                            ${data.pickupDate}
                          </span>
                        </td>
                        <td width="50%" style="padding-bottom: 12px; vertical-align: top;">
                          <span style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: #64748b; display: block;">
                            ⏰ Pickup Time Slot
                          </span>
                          <span style="font-size: 13px; font-weight: 700; color: #1e293b; display: block; margin-top: 2px;">
                            ${data.pickupTimeSlot}
                          </span>
                        </td>
                      </tr>

                      <!-- Pickup Counter & Fee -->
                      <tr>
                        <td width="50%" style="vertical-align: top;">
                          <span style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: #64748b; display: block;">
                            📍 Designated Window
                          </span>
                          <span style="font-size: 13px; font-weight: 700; color: #1d4ed8; display: block; margin-top: 2px;">
                            ${location}
                          </span>
                        </td>
                        <td width="50%" style="vertical-align: top;">
                          <span style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: #64748b; display: block;">
                            💰 Document Fee
                          </span>
                          <span style="font-size: 13px; font-weight: 800; color: #059669; display: block; margin-top: 2px;">
                            ${feeDisplay}
                          </span>
                        </td>
                      </tr>

                    </table>
                  </td>
                </tr>
              </table>

              <!-- CLAIMING INSTRUCTIONS -->
              ${instructions ? `
              <div style="background-color: #f1f5f9; border-left: 4px solid #2563eb; padding: 12px 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
                <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #1e293b; display: block;">
                  📌 Special Claiming Note:
                </span>
                <p style="margin: 4px 0 0 0; font-size: 13px; color: #334155; line-height: 1.5;">
                  ${instructions}
                </p>
              </div>
              ` : ''}

              <!-- WHAT TO BRING (CHECKLIST) -->
              <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #0f172a;">
                🎒 What to Bring When Claiming:
              </h3>
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px;">
                <tr>
                  <td style="padding: 6px 0; font-size: 13px; line-height: 1.5; color: #334155;">
                    <span style="color: #059669; font-weight: bold; margin-right: 8px;">✓</span>
                    <strong>Valid Government-Issued ID</strong> (Original copy for identity verification).
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 13px; line-height: 1.5; color: #334155;">
                    <span style="color: #059669; font-weight: bold; margin-right: 8px;">✓</span>
                    <strong>Tracking Reference Number</strong> (Present this email or screenshot on your phone).
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 13px; line-height: 1.5; color: #334155;">
                    <span style="color: #059669; font-weight: bold; margin-right: 8px;">✓</span>
                    <strong>Exact Document Fee Amount</strong> (${feeDisplay}) if not yet paid online.
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 13px; line-height: 1.5; color: #334155;">
                    <span style="color: #059669; font-weight: bold; margin-right: 8px;">✓</span>
                    <strong>Authorization Letter</strong> (If sending an authorized representative to claim on your behalf, along with representative's valid ID).
                  </td>
                </tr>
              </table>

              <!-- ADVISORY / REMINDER BOX -->
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 14px 16px;">
                    <p style="margin: 0; font-size: 12px; color: #92400e; line-height: 1.5;">
                      <strong>⚠️ Claiming Period Notice:</strong> Processed certificates are reserved for thirty (30) calendar days from this notification. Documents unclaimed after 30 days may be archived. Please observe proper dress code and decorum when visiting the Barangay Hall.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CLOSING SIGN-OFF -->
              <p style="margin: 0; font-size: 13px; color: #475569; line-height: 1.5;">
                Daghang salamat sa imong pagsalig sa serbisyo sa atong barangay!
              </p>
              <p style="margin: 8px 0 0 0; font-size: 13px; font-weight: 700; color: #0f172a;">
                Office of the Punong Barangay & Sangguniang Barangay<br>
                <span style="font-weight: 500; color: #64748b; font-size: 12px;">Barangay Zapatera, Cebu City</span>
              </p>

            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 28px; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px;">
                ${barangayName} • Official Document Services
              </p>
              <p style="margin: 0 0 4px 0; font-size: 11px; color: #94a3b8; line-height: 1.4;">
                ${barangayAddress}
              </p>
              <p style="margin: 0 0 12px 0; font-size: 11px; color: #94a3b8; line-height: 1.4;">
                Hotline: ${barangayContact} • Office Hours: ${operatingHours}
              </p>
              <p style="margin: 0; font-size: 10px; color: #cbd5e1; line-height: 1.4;">
                This is an automated transactional notification regarding your official barangay request. Please do not reply directly to this email. For inquiries, please call our hotline or visit our desk during office hours.
              </p>
            </td>
          </tr>

        </table>
        <!-- End Main Card -->

      </td>
    </tr>
  </table>

</body>
</html>`;
}

/**
 * Generates an alternative plaintext version for accessibility and spam score optimization.
 */
export function generatePickupEmailText(data: PickupEmailData): string {
  const barangayName = data.barangayName || 'BARANGAY ZAPATERA';
  const location = data.pickupLocation || 'Express Window 2, Barangay Hall Lobby, Rahmann St.';
  const feeDisplay = typeof data.fee === 'number'
    ? (data.fee > 0 ? `PHP ${data.fee.toFixed(2)}` : 'FREE OF CHARGE')
    : (data.fee || 'FREE OF CHARGE');

  return `
============================================================
${barangayName} - OFFICIAL DOCUMENT READY FOR PICKUP
============================================================

Maayong Adlaw, ${data.residentName}!

Your requested official document is now READY FOR PICKUP at the Barangay Hall.

DOCUMENT DETAILS:
- Document: ${data.documentTitle}
- Tracking Number: ${data.trackingNumber}
- Scheduled Pickup Date: ${data.pickupDate}
- Pickup Time Slot: ${data.pickupTimeSlot}
- Pickup Window / Counter: ${location}
- Processing Fee: ${feeDisplay}

CLAIMING INSTRUCTIONS:
${data.pickupInstructions || 'Proceed to Express Window 2 and present your tracking reference number.'}

WHAT TO BRING:
1. Valid Government-Issued ID (Original copy)
2. Tracking Reference Number: ${data.trackingNumber}
3. Exact Document Fee (${feeDisplay})
4. Authorization Letter & Proxy's Valid ID (if someone is claiming for you)

OFFICE HOURS & LOCATION:
Barangay Hall, Rahmann St., Zapatera, Cebu City
Monday to Friday: 8:00 AM - 5:00 PM
Hotline: (032) 254-8721

Daghang salamat sa imong kooperasyon!
Office of the Punong Barangay - Barangay Zapatera
============================================================
`.trim();
}
