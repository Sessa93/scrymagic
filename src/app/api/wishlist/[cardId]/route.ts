import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { invalidateWishlistRecommendationsCache } from "@/lib/wishlist-recommendations-cache";

function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ cardId: string }> },
) {
  let session;
  try {
    session = await requireAuth();
  } catch {
    return unauthorizedResponse();
  }

  const { cardId } = await params;

  await prisma.wishlistItem.deleteMany({
    where: {
      userId: session.user.id,
      cardId,
    },
  });

  await invalidateWishlistRecommendationsCache(session.user.id);

  return NextResponse.json({ removed: true });
}
