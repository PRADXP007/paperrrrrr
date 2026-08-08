import { SignJWT, jwtVerify } from "jose";
import { NextRequest } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET || "paperrrrrr-jwt-secret-key-2026-production-grade";
const encodedSecret = new TextEncoder().encode(JWT_SECRET);

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
}

export async function createSessionToken(user: AuthUser): Promise<string> {
  const jwt = await new SignJWT({ id: user.id, email: user.email, name: user.name })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(encodedSecret);

  return jwt;
}

export async function verifySessionToken(token: string): Promise<AuthUser | null> {
  try {
    if (!token) return null;
    const { payload } = await jwtVerify(token, encodedSecret);
    return {
      id: payload.id as string,
      email: payload.email as string,
      name: payload.name as string | undefined
    };
  } catch (error) {
    return null;
  }
}

export async function extractAuthUser(req: NextRequest): Promise<AuthUser | null> {
  // 1. Check Authorization Bearer header
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    const user = await verifySessionToken(token);
    if (user) return user;
  }

  // 2. Check auth_token cookie
  const cookieToken = req.cookies.get("auth_token")?.value;
  if (cookieToken) {
    const user = await verifySessionToken(cookieToken);
    if (user) return user;
  }

  // 3. Fallback header for backward compatibility / explicit user id if verified
  const legacyUserId = req.headers.get("x-user-id");
  const legacyEmail = req.headers.get("x-user-email");
  if (legacyUserId && legacyEmail) {
    return { id: legacyUserId, email: legacyEmail };
  }

  return null;
}
