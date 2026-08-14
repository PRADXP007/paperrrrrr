import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), ".data");

function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (e) {
    console.warn("Could not create .data directory, continuing in-memory:", e);
  }
}

// In-memory fallbacks
let inMemoryUsers: any[] = [];
let inMemoryDocs: any[] = [];

// Helper to read JSON file safely
function readJsonFile(filename: string, fallback: any[]) {
  try {
    ensureDataDir();
    const filePath = path.join(DATA_DIR, filename);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(content);
    }
  } catch (e) {
    console.warn(`Error reading ${filename}:`, e);
  }
  return fallback;
}

// Helper to write JSON file safely
function writeJsonFile(filename: string, data: any) {
  try {
    ensureDataDir();
    const filePath = path.join(DATA_DIR, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.warn(`Error writing ${filename}:`, e);
  }
}

// ---------------------------------------------------------------------------
// LOCAL USER STORE
// ---------------------------------------------------------------------------
export function getLocalUsers(): any[] {
  return readJsonFile("users.json", inMemoryUsers);
}

export function saveLocalUser(user: any) {
  const users = getLocalUsers();
  const existingIdx = users.findIndex((u: any) => u.email.toLowerCase() === user.email.toLowerCase());
  if (existingIdx >= 0) {
    users[existingIdx] = { ...users[existingIdx], ...user, updatedAt: new Date().toISOString() };
  } else {
    users.push({
      _id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...user
    });
  }
  inMemoryUsers = users;
  writeJsonFile("users.json", users);
  return users.find((u: any) => u.email.toLowerCase() === user.email.toLowerCase());
}

export function findLocalUserByEmail(email: string) {
  const users = getLocalUsers();
  return users.find((u: any) => u.email.toLowerCase() === email.toLowerCase()) || null;
}

// ---------------------------------------------------------------------------
// LOCAL DOCUMENT HISTORY STORE
// ---------------------------------------------------------------------------
export function getLocalDocuments(userEmail?: string, userId?: string): any[] {
  const docs = readJsonFile("documents.json", inMemoryDocs);
  if (!userEmail && !userId) {
    return docs.sort((a: any, b: any) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
  }
  return docs
    .filter((d: any) => {
      if (userEmail && d.userEmail && d.userEmail.toLowerCase() === userEmail.toLowerCase()) return true;
      if (userId && d.userId && d.userId === userId) return true;
      return !d.userId && !d.userEmail; // also return unassigned local docs
    })
    .sort((a: any, b: any) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
}

export function saveLocalDocument(doc: any) {
  const docs = readJsonFile("documents.json", inMemoryDocs);
  const docId = doc._id || doc.id || `doc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const existingIdx = docs.findIndex((d: any) => (d._id || d.id) === docId);

  const docRecord = {
    _id: docId,
    id: docId,
    title: doc.title || "Untitled Document",
    subtitle: doc.subtitle || "",
    prompt: doc.prompt || doc.title || "",
    format: doc.format || "docx",
    tone: doc.tone || "Academic & Analytical",
    docType: doc.docType || "Research Report",
    userId: doc.userId,
    userEmail: doc.userEmail,
    outline: doc.outline || doc.sections || [],
    sections: doc.sections || doc.outline || [],
    status: doc.status || "completed",
    createdAt: doc.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (existingIdx >= 0) {
    docs[existingIdx] = { ...docs[existingIdx], ...docRecord };
  } else {
    docs.unshift(docRecord);
  }

  inMemoryDocs = docs;
  writeJsonFile("documents.json", docs);
  return docRecord;
}
