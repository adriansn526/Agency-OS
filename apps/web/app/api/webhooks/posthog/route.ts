import { NextResponse } from "next/server";
import { db } from "@repo/db";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    console.log("🔔 [PostHog Webhook] Alertă nouă primită:", payload);

    // Extract relevant data (PostHog webhook structure)
    const title = payload.text || payload.title || "Alertă PostHog necunoscută";
    const description = JSON.stringify(payload, null, 2);
    const url = payload.url || payload.actionUrl || null;
    const domain = payload.domain || null; // Daca este prezent

    // Save to database
    await db.systemAlert.create({
      data: {
        source: "posthog",
        title: title,
        description: description,
        url: url,
        domain: domain,
        status: "new",
        severity: "medium", // Poate fi ajustat din payload dacă PostHog trimite un nivel
        metadata: payload,
      },
    });

    return NextResponse.json({ success: true, message: "Webhook primit și salvat cu succes" });
  } catch (error) {
    console.error("❌ [PostHog Webhook] Eroare la procesarea webhook-ului:", error);
    return NextResponse.json(
      { success: false, error: "Eroare la procesarea datelor" },
      { status: 500 }
    );
  }
}
