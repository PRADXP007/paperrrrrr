import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { extractAuthUser } from "@/lib/auth";
import { getLocalDocuments, saveLocalDocument } from "@/lib/localStore";
import Document from "@/models/Document";

export async function GET(req: NextRequest) {
  try {
    const authUser = await extractAuthUser(req);

    // If user is not authenticated, return empty list so the client renders only their local browser session docs
    if (!authUser) {
      return NextResponse.json({ documents: [] });
    }

    const conn = await connectToDatabase();

    if (!conn) {
      const localDocs = getLocalDocuments(authUser.email, authUser.id);
      return NextResponse.json({ documents: localDocs });
    }

    const query = {
      $or: [
        { userId: authUser.id },
        { userEmail: authUser.email.toLowerCase() }
      ]
    };

    const docs = await (Document as any).find(query).sort({ updatedAt: -1 }).limit(50);
    return NextResponse.json({ documents: docs });
  } catch (error: any) {
    // Fallback to local store on error
    const authUser = await extractAuthUser(req).catch(() => null);
    if (!authUser) {
      return NextResponse.json({ documents: [] });
    }
    const localDocs = getLocalDocuments(authUser.email, authUser.id);
    return NextResponse.json({ documents: localDocs });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await extractAuthUser(req);
    const body = await req.json();
    const { title, subtitle, prompt, format, docType, tone, sections, outline, status = "completed" } = body;

    const rawSections = Array.isArray(sections) && sections.length > 0 ? sections : Array.isArray(outline) ? outline : [];
    const formattedSections = rawSections.map((s: any, idx: number) => ({
      id: s.id || `sec_${idx + 1}`,
      title: s.title || `Section ${idx + 1}`,
      brief: s.brief || "",
      keyPoints: Array.isArray(s.keyPoints) ? s.keyPoints : [],
      relevantSourceIndices: Array.isArray(s.relevantSourceIndices) ? s.relevantSourceIndices : [],
      content: s.content || "",
      status: s.status || "completed"
    }));

    const docData = {
      title: title || prompt || "Untitled Document",
      subtitle: subtitle || "",
      prompt: prompt || title || "",
      format: format || "docx",
      docType: docType || "Research Report",
      tone: tone || "Academic & Analytical",
      userId: authUser?.id || undefined,
      userEmail: authUser?.email ? authUser.email.toLowerCase() : undefined,
      sections: formattedSections,
      outline: formattedSections,
      status
    };

    // Save to local store
    const localSaved = saveLocalDocument(docData);

    // Save to MongoDB if available
    let dbDoc = null;
    try {
      const conn = await connectToDatabase();
      if (conn) {
        dbDoc = await (Document as any).create(docData);
      }
    } catch (dbErr) {
      console.warn("MongoDB document save skipped:", dbErr);
    }

    return NextResponse.json({ success: true, document: dbDoc || localSaved });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to save document" }, { status: 500 });
  }
}