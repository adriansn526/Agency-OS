import { NextRequest, NextResponse } from "next/server";
import { getDomainPagesBacklinks } from "@/lib/integrations/dataforseo";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const target = searchParams.get('target');

    if (!target) {
      return NextResponse.json({ error: "Missing target parameter" }, { status: 400 });
    }

    const pages = await getDomainPagesBacklinks(target, 500);

    return NextResponse.json({ pages });
  } catch (error: any) {
    console.error("[DataForSEO Pages API Error]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
