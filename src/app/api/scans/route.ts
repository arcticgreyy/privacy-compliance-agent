import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const websiteId = request.nextUrl.searchParams.get("websiteId");
  if (!websiteId) {
    return NextResponse.json(
      { error: "websiteId is required" },
      { status: 400 }
    );
  }

  const scans = await prisma.scan.findMany({
    where: { websiteId },
    include: {
      violations: true,
      _count: {
        select: {
          observedTags: true,
          disclosedVendors: true,
          violations: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(scans);
}

export async function POST(request: NextRequest) {
  const { websiteId } = await request.json();
  if (!websiteId) {
    return NextResponse.json(
      { error: "websiteId is required" },
      { status: 400 }
    );
  }

  const website = await prisma.website.findUnique({
    where: { id: websiteId },
  });

  if (!website) {
    return NextResponse.json({ error: "Website not found" }, { status: 404 });
  }

  const scan = await prisma.scan.create({
    data: { websiteId, status: "PENDING" },
  });

  // TODO: In Phase 2, push to Cloud Tasks to trigger Playwright worker
  // For now, return the created scan so the frontend can track it

  return NextResponse.json(scan, { status: 201 });
}
