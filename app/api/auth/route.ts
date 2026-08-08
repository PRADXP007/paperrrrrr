import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/mongodb";
import { createSessionToken } from "@/lib/auth";
import User from "@/models/User";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, name, email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const conn = await connectToDatabase();
    if (!conn) {
      const demoUser = { id: "demo-user-1", name: name || email.split("@")[0], email };
      const token = await createSessionToken(demoUser);
      const res = NextResponse.json({ user: demoUser, token });
      res.cookies.set("auth_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60,
        path: "/"
      });
      return res;
    }

    if (action === "signup") {
      const existing = await (User as any).findOne({ email });
      if (existing) {
        return NextResponse.json({ error: "User already exists" }, { status: 400 });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await (User as any).create({
        name: name || email.split("@")[0],
        email,
        passwordHash
      });

      const authUser = { id: user._id.toString(), name: user.name, email: user.email };
      const token = await createSessionToken(authUser);

      const res = NextResponse.json({ user: authUser, token });
      res.cookies.set("auth_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60,
        path: "/"
      });
      return res;
    } else {
      const user = await (User as any).findOne({ email });
      if (!user) {
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
      }

      const authUser = { id: user._id.toString(), name: user.name, email: user.email };
      const token = await createSessionToken(authUser);

      const res = NextResponse.json({ user: authUser, token });
      res.cookies.set("auth_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60,
        path: "/"
      });
      return res;
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Authentication failed" }, { status: 500 });
  }
}

