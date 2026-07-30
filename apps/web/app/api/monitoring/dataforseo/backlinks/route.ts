import { NextRequest, NextResponse } from "next/server";
import { getDomainBacklinksSummary, getDomainBacklinksDetail } from "@/lib/integrations/dataforseo";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const target = searchParams.get('target');

    if (!target) {
      return NextResponse.json({ error: "Missing target parameter" }, { status: 400 });
    }

    let summary = null;
    let backlinks: any[] = [];
    let detailError = null;

    try {
      summary = await getDomainBacklinksSummary(target);
    } catch (e) {
      console.error("[Backlinks Summary Error]", e);
    }

    try {
      backlinks = await getDomainBacklinksDetail(target, 1000);
    } catch (e: any) {
      console.error("[Backlinks Detail Error]", e);
      detailError = e.message;
    }

    return NextResponse.json({ summary, backlinks, detailError });
  } catch (error: any) {
    console.error("[Backlinks API Error]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
