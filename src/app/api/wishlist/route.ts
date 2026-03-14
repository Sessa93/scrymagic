import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const MAX_WISHLIST_ITEMS = 1000;

const wishlistCreateSchema = z.object({
  cardId: z.string().trim().min(1),
  name: z.string().trim().min(1).max(200),
  setCode: z.string().trim().min(1).max(12),
  setName: z.string().trim().min(1).max(200),
  typeLine: z.string().trim().min(1).max(200),
  colorIdentity: z.array(z.string().trim().min(1).max(2)).max(5).default([]),
  imageUrl: z.string().trim().min(1).max(500).optional(),
  scryfallUri: z.string().trim().url().optional(),
  cmc: z.number().nonnegative().optional(),
  usd: z.string().trim().optional(),
  usdFoil: z.string().trim().optional(),
  eur: z.string().trim().optional(),
  tix: z.string().trim().optional(),
});

function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET() {
  let session;
  try {
    session = await requireAuth();
  } catch {
    return unauthorizedResponse();
  }

  const items = await prisma.wishlistItem.findMany({
    where: { userId: session.user.id },
    orderBy: { addedAt: "desc" },
  });

  return NextResponse.json({
    items,
    maxItems: MAX_WISHLIST_ITEMS,
  });
}

export async function POST(request: Request) {
  let session;
  try {
    session = await requireAuth();
  } catch {
    return unauthorizedResponse();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 },
    );
  }

  const parsed = wishlistCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        issues: parsed.error.issues.map((issue) => issue.message),
      },
      { status: 400 },
    );
  }

  const input = parsed.data;

  const existing = await prisma.wishlistItem.findUnique({
    where: {
      userId_cardId: {
        userId: session.user.id,
        cardId: input.cardId,
      },
    },
  });

  if (existing) {
    return NextResponse.json({ item: existing, created: false });
  }

  const count = await prisma.wishlistItem.count({
    where: { userId: session.user.id },
  });

  if (count >= MAX_WISHLIST_ITEMS) {
    return NextResponse.json(
      {
        error: `Wishlist limit reached (${MAX_WISHLIST_ITEMS} cards). Remove some cards before adding more.`,
        maxItems: MAX_WISHLIST_ITEMS,
      },
      { status: 409 },
    );
  }

  const item = await prisma.wishlistItem.create({
    data: {
      userId: session.user.id,
      cardId: input.cardId,
      name: input.name,
      setCode: input.setCode,
      setName: input.setName,
      typeLine: input.typeLine,
      colorIdentity: input.colorIdentity,
      imageUrl: input.imageUrl,
      scryfallUri: input.scryfallUri,
      cmc: input.cmc,
      usd: input.usd,
      usdFoil: input.usdFoil,
      eur: input.eur,
      tix: input.tix,
    },
  });

  return NextResponse.json({ item, created: true }, { status: 201 });
}
