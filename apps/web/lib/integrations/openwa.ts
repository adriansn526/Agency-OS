/**
 * OpenWA (WhatsApp API) Integration
 * Handles sending messages via the local OpenWA instance.
 */

export async function sendWhatsAppAlert(agentPhone: string, leadPhone: string, messageText: string): Promise<boolean> {
  const apiUrl = process.env.OPENWA_API_URL; // e.g., http://localhost:2785
  const apiKey = process.env.OPENWA_API_KEY;
  const sessionId = process.env.OPENWA_SESSION_ID;

  if (!apiUrl || !apiKey || !sessionId) {
    console.error("[OpenWA] Missing configuration: OPENWA_API_URL, OPENWA_API_KEY, or OPENWA_SESSION_ID");
    return false;
  }

  // Format the lead phone number for the wa.me link
  const formattedLeadPhone = leadPhone.replace(/\D/g, '');

  const alertMessage = 
    `🚨 *LEAD NOU de pe site!*\n` +
    `📞 Telefon: wa.me/${formattedLeadPhone}\n` +
    `💬 Mesaj: "${messageText}"`;

  // Support multiple phone numbers separated by comma
  const phones = agentPhone.split(',').map(p => p.trim()).filter(Boolean);
  let allSuccess = true;

  for (const phone of phones) {
    const formattedAgentPhone = phone.replace(/\D/g, ''); // Remove non-numeric
    const chatId = `${formattedAgentPhone}@c.us`;

    try {
      const response = await fetch(`${apiUrl}/api/sessions/${sessionId}/messages/send-text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify({
          chatId: chatId,
          text: alertMessage,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[OpenWA] Failed to send message to ${phone}: ${response.status} ${response.statusText} - ${errorText}`);
        allSuccess = false;
      }
    } catch (error) {
      console.error(`[OpenWA] Network error sending message to ${phone}:`, error);
      allSuccess = false;
    }
  }

  return allSuccess;
}
