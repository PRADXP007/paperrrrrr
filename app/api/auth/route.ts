import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/mongodb";
import { createSessionToken, extractAuthUser } from "@/lib/auth";
import { findLocalUserByEmail, saveLocalUser } from "@/lib/localStore";
import User from "@/models/User";

export async function GET(req: NextRequest) {
  try {
    const authUser = await extractAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ user: null });
    }
    return NextResponse.json({ user: authUser });
  } catch (error: any) {
    return NextResponse.json({ user: null });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, name, email, password } = body;

    if (action === "logout") {
      const res = NextResponse.json({ success: true, message: "Logged out" });
      res.cookies.set("auth_token", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 0,
        path: "/"
      });
      return res;
    }

    if (action === "google") {
      const gEmail = (email || "researcher.scholar@gmail.com").toLowerCase().trim();
      const gName = name || (gEmail.includes("@") ? gEmail.split("@")[0].replace(/\./g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()) : "Institutional Researcher");
      const avatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${gEmail}`;

      try {
        const conn = await connectToDatabase();
        if (conn) {
          let user = await (User as any).findOne({ email: gEmail });
          if (!user) {
            user = await (User as any).create({
              name: gName,
              email: gEmail,
              avatar,
              authProvider: "google"
            });
          }

          const authUser = {
            id: user._id.toString(),
            name: user.name || gName,
            email: user.email,
            avatar: user.avatar || avatar
          };

          saveLocalUser({ _id: authUser.id, name: authUser.name, email: authUser.email });
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
        }
      } catch (dbErr) {
        console.warn("MongoDB Google Auth fallback:", dbErr);
      }

      // Fallback local auth
      const googleUser = {
        _id: `g_user_${Date.now()}`,
        name: gName,
        email: gEmail,
        avatar,
        provider: "google"
      };

      const saved = saveLocalUser(googleUser);
      const authUser = { id: saved._id, name: saved.name, email: saved.email, avatar };
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
    }

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const conn = await connectToDatabase();

    if (!conn) {
      // Local fallback auth
      if (action === "signup") {
        const existing = findLocalUserByEmail(email);
        if (existing) {
          return NextResponse.json({ error: "User already exists with this email" }, { status: 400 });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const newUser = saveLocalUser({
          name: name || email.split("@")[0],
          email: email.toLowerCase(),
          passwordHash
        });

        const authUser = { id: newUser._id, name: newUser.name, email: newUser.email };
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
        const user = findLocalUserByEmail(email);
        if (!user) {
          return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
        }

        const authUser = { id: user._id, name: user.name, email: user.email };
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
    }

    // MongoDB Connected Auth
    if (action === "signup") {
      const existing = await (User as any).findOne({ email: email.toLowerCase() });
      if (existing) {
        return NextResponse.json({ error: "User already exists with this email" }, { status: 400 });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await (User as any).create({
        name: name || email.split("@")[0],
        email: email.toLowerCase(),
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
      const user = await (User as any).findOne({ email: email.toLowerCase() });
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

