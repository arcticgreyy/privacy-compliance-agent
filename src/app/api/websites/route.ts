import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const createWebsiteSchema = z.object({
  domain: z
    .string()
    .min(1)
    .transform((d) => d.replace(/^https?:\/\//, "").replace(/\/+$/, "")),
  scanFrequency: z.enum(["DAILY", "WEEKLY", "MONTHLY"]).default("WEEKLY"),
  organizationId: z.string().min(1),
});

export async function GET(request: NextRequest) {
  const orgId = request.nextUrl.searchParams.get("organizationId");
  if (!orgId) {
    return NextResponse.json(
      { error: "organizationId is required" },
      { status: 400 }
    );
  }

  const websites = await prisma.website.findMany({
    where: { organizationId: orgId },
    include: {
      scans: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(websites);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = createWebsiteSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { domain, scanFrequency, organizationId } = parsed.data;

  const existing = await prisma.website.findUnique({
    where: { organizationId_domain: { organizationId, domain } },
  });

  if (existing) {
    return NextResponse.json(
      { error: "This domain is already registered for your organization" },
      { status: 409 }
    );
  }

  const website = await prisma.website.create({
    data: { domain, scanFrequency, organizationId },
  });

  return NextResponse.json(website, { status: 201 });
}
