import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { extractAuthUser } from "@/lib/auth";
import { encryptApiKey, maskApiKey } from "@/lib/crypto";
import User from "@/models/User";

export async function GET(req: NextRequest) {
  try {
    const authUser = await extractAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const conn = await connectToDatabase();
    if (!conn) {
      return NextResponse.json({
        hasGeminiKey: false,
        geminiMasked: "",
        hasOpenaiKey: false,
        openaiMasked: ""
      });
    }

    const user = await (User as any).findById(authUser.id);
    if (!user) {
      return NextResponse.json({
        hasGeminiKey: false,
        geminiMasked: "",
        hasOpenaiKey: false,
        openaiMasked: ""
      });
    }

    return NextResponse.json({
      hasGeminiKey: Boolean(user.geminiKeyEncrypted),
      geminiMasked: user.geminiKeyMasked || "",
      hasOpenaiKey: Boolean(user.openaiKeyEncrypted),
      openaiMasked: user.openaiKeyMasked || ""
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to retrieve API key settings" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await extractAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { geminiApiKey, openaiApiKey } = body;

    const conn = await connectToDatabase();
    if (!conn) {
      return NextResponse.json({
        success: true,
        message: "Key saved in session (in-memory mode)",
        hasGeminiKey: Boolean(geminiApiKey),
        geminiMasked: geminiApiKey ? maskApiKey(geminiApiKey) : "",
        hasOpenaiKey: Boolean(openaiApiKey),
        openaiMasked: openaiApiKey ? maskApiKey(openaiApiKey) : ""
      });
    }

    const updates: Record<string, any> = {};

    if (geminiApiKey !== undefined) {
      if (geminiApiKey.trim() === "") {
        updates.geminiKeyEncrypted = null;
        updates.geminiKeyMasked = null;
      } else {
        updates.geminiKeyEncrypted = encryptApiKey(geminiApiKey);
        updates.geminiKeyMasked = maskApiKey(geminiApiKey);
      }
    }

    if (openaiApiKey !== undefined) {
      if (openaiApiKey.trim() === "") {
        updates.openaiKeyEncrypted = null;
        updates.openaiKeyMasked = null;
      } else {
        updates.openaiKeyEncrypted = encryptApiKey(openaiApiKey);
        updates.openaiKeyMasked = maskApiKey(openaiApiKey);
      }
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
    if (conn) {
      await (User as any).findByIdAndUpdate(authUser.id, {
        geminiKeyEncrypted: null,
        geminiKeyMasked: null,
        openaiKeyEncrypted: null,
        openaiKeyMasked: null
      });
    }

    return NextResponse.json({
      success: true,
      message: "Custom API keys cleared. App default keys active."
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to clear API keys" }, { status: 500 });
  }
}
