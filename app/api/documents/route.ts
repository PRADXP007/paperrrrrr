import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { extractAuthUser } from "@/lib/auth";
import { getLocalDocuments, saveLocalDocument } from "@/lib/localStore";
import Document from "@/models/Document";

export async function GET(req: NextRequest) {
  try {
    const authUser = await extractAuthUser(req);
    const conn = await connectToDatabase();

    if (!conn) {
      const localDocs = getLocalDocuments(authUser?.email, authUser?.id);
      return NextResponse.json({ documents: localDocs });
    }

    let query: any = {};
    if (authUser) {
      query = {
        $or: [
          { userId: authUser.id },
          { userEmail: authUser.email }
        ]
      };
    }

    const docs = await (Document as any).find(query).sort({ updatedAt: -1 }).limit(50);
    return NextResponse.json({ documents: docs });
  } catch (error: any) {
    // Fallback to local store on error
    const authUser = await extractAuthUser(req).catch(() => null);
    const localDocs = getLocalDocuments(authUser?.email, authUser?.id);
    return NextResponse.json({ documents: localDocs });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await extractAuthUser(req);
    const body = await req.json();
    const { title, subtitle, prompt, format, docType, tone, sections, outline, status = "completed" } = body;

    const docData = {
      title: title || prompt || "Untitled Document",
      subtitle: subtitle || "",
      prompt: prompt || title || "",
      format: format || "docx",
      docType: docType || "Research Report",
      tone: tone || "Academic & Analytical",
      userId: authUser?.id,
      userEmail: authUser?.email,
      sections: sections || outline || [],
      outline: outline || sections || [],
      status
    };

    // Save to local store
    const localSaved = saveLocalDocument(docData);

    // Save to MongoDB if available
    try {
      const conn = await connectToDatabase();
      if (conn) {
        await (Document as any).create({
          ...docData,
          _id: undefined
        });
      }
    } catch (dbErr) {
      console.warn("MongoDB document save skipped:", dbErr);
    }

    return NextResponse.json({ success: true, document: localSaved });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to save document" }, { status: 500 });
  }
}

