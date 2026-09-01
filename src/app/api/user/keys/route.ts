import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import { extractAuthUser } from "@/lib/auth";
import { encryptApiKey, maskApiKey } from "@/lib/crypto";
import { findLocalUserByEmail, saveLocalUser } from "@/lib/localStore";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const authUser = await extractAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const conn = await connectToDatabase();
    if (!conn) {
      const localUser = findLocalUserByEmail(authUser.email);
      return NextResponse.json({
        hasGeminiKey: Boolean(localUser?.geminiKeyEncrypted),
        geminiMasked: localUser?.geminiKeyMasked || "",
        hasOpenaiKey: Boolean(localUser?.openaiKeyEncrypted),
        openaiMasked: localUser?.openaiKeyMasked || ""
      });
    }

    const user = await (User as any).findById(authUser.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      hasGeminiKey: Boolean(user.geminiKeyEncrypted),
      geminiMasked: user.geminiKeyMasked || "",
      hasOpenaiKey: Boolean(user.openaiKeyEncrypted),
      openaiMasked: user.openaiKeyMasked || ""
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch key status" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await extractAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const geminiApiKey = body.geminiApiKey !== undefined ? body.geminiApiKey : body.geminiKey;
    const openaiApiKey = body.openaiApiKey !== undefined ? body.openaiApiKey : body.openaiKey;

    const updates: Record<string, any> = {};

    if (geminiApiKey !== undefined) {
      if (!geminiApiKey || geminiApiKey.trim() === "") {
        updates.geminiKeyEncrypted = null;
        updates.geminiKeyMasked = null;
      } else {
        updates.geminiKeyEncrypted = encryptApiKey(geminiApiKey.trim());
        updates.geminiKeyMasked = maskApiKey(geminiApiKey.trim());
      }
    }

    if (openaiApiKey !== undefined) {
      if (!openaiApiKey || openaiApiKey.trim() === "") {
        updates.openaiKeyEncrypted = null;
        updates.openaiKeyMasked = null;
      } else {
        updates.openaiKeyEncrypted = encryptApiKey(openaiApiKey.trim());
        updates.openaiKeyMasked = maskApiKey(openaiApiKey.trim());
      }
    }

    const conn = await connectToDatabase();
    if (!conn) {
      const updatedLocalUser = saveLocalUser({ email: authUser.email, ...updates });
      return NextResponse.json({
        success: true,
        message: "Key saved to local secure store",
        hasGeminiKey: Boolean(updatedLocalUser?.geminiKeyEncrypted),
        geminiMasked: updatedLocalUser?.geminiKeyMasked || "",
        hasOpenaiKey: Boolean(updatedLocalUser?.openaiKeyEncrypted),
        openaiMasked: updatedLocalUser?.openaiKeyMasked || ""
      });
    }

    const user = await (User as any).findByIdAndUpdate(authUser.id, updates, { new: true });

    return NextResponse.json({
      success: true,
      hasGeminiKey: Boolean(user?.geminiKeyEncrypted),
      geminiMasked: user?.geminiKeyMasked || "",
      hasOpenaiKey: Boolean(user?.openaiKeyEncrypted),
      openaiMasked: user?.openaiKeyMasked || ""
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update custom API keys" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authUser = await extractAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const conn = await connectToDatabase();
    if (!conn) {
      saveLocalUser({
        email: authUser.email,
        geminiKeyEncrypted: null,
        geminiKeyMasked: null,
        openaiKeyEncrypted: null,
        openaiKeyMasked: null
      });
      return NextResponse.json({ success: true, message: "Custom keys deleted from local store" });
    }

    await (User as any).findByIdAndUpdate(authUser.id, {
      geminiKeyEncrypted: null,
      geminiKeyMasked: null,
      openaiKeyEncrypted: null,
      openaiKeyMasked: null
    });

    return NextResponse.json({ success: true, message: "Custom keys deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete custom API keys" }, { status: 500 });
  }
}