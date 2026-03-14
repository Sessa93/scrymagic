import { NextResponse } from "next/server";
import { hash } from "argon2";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { consumeRateLimit, extractClientIp } from "@/lib/rate-limit";

const registrationSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3)
    .max(24)
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username may only contain letters, numbers, and underscores",
    ),
  email: z.string().trim().email(),
  password: z
    .string()
    .min(8)
    .max(128)
    .regex(/[A-Z]/, "Password must include an uppercase letter")
    .regex(/[a-z]/, "Password must include a lowercase letter")
    .regex(/[0-9]/, "Password must include a number"),
});

export async function POST(request: Request) {
  const ip = extractClientIp(request.headers);
  const ipLimit = await consumeRateLimit({
    scope: "auth:register:ip",
    identifier: ip,
    limit: 5,
    windowSeconds: 600,
  });

  if (!ipLimit.allowed) {
    return NextResponse.json(
      {
        error: "Too many registration attempts from this address. Please try again later.",
        retryAfterSeconds: ipLimit.retryAfterSeconds,
      },
      { status: 429 },
    );
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

  const parsed = registrationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        issues: parsed.error.issues.map((issue) => issue.message),
      },
      { status: 400 },
    );
  }

  const { username, email, password } = parsed.data;

  const emailLimit = await consumeRateLimit({
    scope: "auth:register:email",
    identifier: email,
    limit: 3,
    windowSeconds: 600,
  });

  if (!emailLimit.allowed) {
    return NextResponse.json(
      {
        error: "Too many registration attempts for this email. Please try again later.",
        retryAfterSeconds: emailLimit.retryAfterSeconds,
      },
      { status: 429 },
    );
  }

  try {
    const passwordHash = await hash(password, {
      type: 2,
      memoryCost: 19_456,
      timeCost: 2,
      parallelism: 1,
    });

    const user = await prisma.user.create({
      data: {
        username,
        email: email.toLowerCase(),
        passwordHash,
      },
      select: {
        id: true,
        username: true,
        email: true,
      },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Username or email is already in use" },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "Unable to create account" },
      { status: 500 },
    );
  }
}
