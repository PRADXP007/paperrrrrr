import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { extractAuthUser } from "@/lib/auth";
import Document from "@/models/Document";

export async function GET(req: NextRequest) {
  try {
    const authUser = await extractAuthUser(req);
    if (!authUser) {
      return NextResponse.json(
        { error: "Authentication required to access documents", documents: [] },
        { status: 401 }
      );
    }

    const conn = await connectToDatabase();
    if (!conn) {
      return NextResponse.json({ documents: [] });
    }

    const query = {
      $or: [
        { userId: authUser.id },
        { userEmail: authUser.email }
      ]
    };

    const docs = await (Document as any).find(query).sort({ updatedAt: -1 }).limit(30);
    return NextResponse.json({ documents: docs });
  } catch (error: any) {
    return NextResponse.json({ documents: [], error: error.message }, { status: 500 });
  }
}

