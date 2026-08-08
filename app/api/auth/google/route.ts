import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { createSessionToken } from "@/lib/auth";
import User from "@/models/User";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, name, avatar, googleId } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required for Google Sign-In" }, { status: 400 });
    }

    const conn = await connectToDatabase();
    const userName = name || email.split("@")[0];

    if (!conn) {
      // In-memory fallback
      const demoUser = { id: `google-${googleId || "1"}`, name: userName, email, avatar };
      const token = await createSessionToken(demoUser);
      const res = NextResponse.json({ success: true, user: demoUser, token });
      res.cookies.set("auth_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60,
        path: "/"
      });
      return res;
    }

    // Find or create Google authenticated user
    let user = await (User as any).findOne({ email });

    if (!user) {
      user = await (User as any).create({
        name: userName,
        email,
        avatar: avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${email}`,
        authProvider: "google",
        googleId
      });
    } else {
      user.name = userName;
      if (avatar) user.avatar = avatar;
      user.authProvider = "google";
      if (googleId) user.googleId = googleId;
      await user.save();
    }

    const authUser = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      avatar: user.avatar
    };

    const token = await createSessionToken(authUser);

    const res = NextResponse.json({ success: true, user: authUser, token });
    res.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60,
      path: "/"
    });

    return res;
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Google Sign-In failed" }, { status: 500 });
  }
}
