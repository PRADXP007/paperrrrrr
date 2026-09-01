import mongoose, { Schema, Document as MongooseDocument } from "mongoose";

export interface IUser extends MongooseDocument {
  name: string;
  email: string;
  passwordHash?: string;
  avatar?: string;
  authProvider?: "credentials" | "google";
  googleId?: string;
  geminiKeyEncrypted?: string;
  geminiKeyMasked?: string;
  openaiKeyEncrypted?: string;
  openaiKeyMasked?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String },
    avatar: { type: String },
    authProvider: { type: String, enum: ["credentials", "google"], default: "credentials" },
    googleId: { type: String, index: true },
    geminiKeyEncrypted: { type: String },
    geminiKeyMasked: { type: String },
    openaiKeyEncrypted: { type: String },
    openaiKeyMasked: { type: String }
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
