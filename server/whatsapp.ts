import { db } from "./db";
import { appSettings } from "../shared/schema";
import { eq } from "drizzle-orm";

interface WhatsAppConfig {
  token: string;
  fromNumber: string;
  enabled: boolean;
}

interface WhatsAppResult {
  success: boolean;
  message: string;
  sent: boolean;
  whatsappLink?: string;
  apiResponse?: any;
}

export async function getWhatsAppConfig(): Promise<WhatsAppConfig> {
  const rows = await db.select().from(appSettings).where(
    eq(appSettings.key, "whatsapp_token")
  );
  const tokenRow = rows[0];

  const fromRows = await db.select().from(appSettings).where(
    eq(appSettings.key, "whatsapp_from")
  );
  const fromRow = fromRows[0];

  const enabledRows = await db.select().from(appSettings).where(
    eq(appSettings.key, "whatsapp_enabled")
  );
  const enabledRow = enabledRows[0];

  return {
    token: tokenRow?.value || "",
    fromNumber: fromRow?.value || "",
    enabled: enabledRow?.value === "true",
  };
}

function formatPhoneForApi(phone: string): string {
  let cleaned = phone.replace(/[^0-9]/g, "");
  if (cleaned.startsWith("0")) {
    cleaned = "92" + cleaned.slice(1);
  }
  return cleaned;
}

function formatPhoneForWhatsAppLink(phone: string): string {
  let cleaned = phone.replace(/[^0-9]/g, "");
  if (cleaned.startsWith("0")) {
    cleaned = "92" + cleaned.slice(1);
  }
  return cleaned;
}

async function callInvoCloudsApi(config: WhatsAppConfig, to: string, text: string): Promise<WhatsAppResult> {
  const toFormatted = formatPhoneForApi(to);
  const fallbackPhone = formatPhoneForWhatsAppLink(to);
  const fallbackLink = `https://wa.me/${fallbackPhone}?text=${encodeURIComponent(text)}`;

  const fromFormatted = formatPhoneForApi(config.fromNumber);
  const requestBody = {
    messageType: "text",
    requestType: "POST",
    token: config.token,
    from: fromFormatted,
    to: toFormatted,
    text: text,
  };

  console.log("[WhatsApp API] Sending to:", toFormatted, "from:", fromFormatted);

  try {
    const response = await fetch("https://invoclouds.com/api/qr/rest/send_message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.token}`,
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();
    console.log("[WhatsApp API] Status:", response.status, "Full Response:", responseText.substring(0, 800));

    let data: any;
    try {
      data = JSON.parse(responseText);
    } catch {
      console.error("[WhatsApp API] Non-JSON response:", responseText);
      return {
        success: false,
        message: `API returned non-JSON response`,
        sent: false,
        whatsappLink: fallbackLink,
      };
    }

    if (data.success || data.status === "success" || data.sent) {
      console.log("[WhatsApp API] Message sent successfully to", toFormatted);
      return {
        success: true,
        message: data.message || "Message sent via WhatsApp API",
        sent: true,
        apiResponse: data,
      };
    } else {
      console.error("[WhatsApp API] Failed:", JSON.stringify(data));
      return {
        success: false,
        message: data.message || data.error || "Failed to send",
        sent: false,
        whatsappLink: fallbackLink,
        apiResponse: data,
      };
    }
  } catch (error: any) {
    console.error("[WhatsApp API] Error:", error.message);
    return {
      success: false,
      message: error.message,
      sent: false,
      whatsappLink: fallbackLink,
    };
  }
}

export async function sendWhatsAppMessage(
  to: string,
  text: string
): Promise<WhatsAppResult> {
  const config = await getWhatsAppConfig();

  const fallbackPhone = formatPhoneForWhatsAppLink(to);
  const fallbackLink = `https://wa.me/${fallbackPhone}?text=${encodeURIComponent(text)}`;

  if (!config.enabled || !config.token || !config.fromNumber) {
    return {
      success: true,
      message: "WhatsApp API not configured, using fallback link",
      sent: false,
      whatsappLink: fallbackLink,
    };
  }

  return callInvoCloudsApi(config, to, text);
}

export function sendWhatsAppMessageInBackground(
  to: string,
  text: string
): WhatsAppResult {
  getWhatsAppConfig().then(config => {
    if (!config.enabled || !config.token || !config.fromNumber) {
      console.log("[WhatsApp BG] API not configured, skipping for", to);
      return;
    }
    callInvoCloudsApi(config, to, text).then(result => {
      if (result.sent) {
        console.log("[WhatsApp BG] Sent successfully to", to);
      } else {
        console.log("[WhatsApp BG] Failed for", to, ":", result.message);
      }
    }).catch(err => {
      console.error("[WhatsApp BG] Error for", to, ":", err.message);
    });
  }).catch(err => {
    console.error("[WhatsApp BG] Config error:", err.message);
  });

  return {
    success: true,
    message: "WhatsApp message queued for sending",
    sent: true,
  };
}
