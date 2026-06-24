import mongoose from 'mongoose';

export const ROLES = {
  OWNER: 'OWNER',
  EDITOR: 'EDITOR',
  VIEWER: 'VIEWER',
};

const DocumentMemberSchema = new mongoose.Schema(
  {
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, enum: Object.values(ROLES), required: true },
  },
  { timestamps: true }
);

DocumentMemberSchema.index({ documentId: 1, userId: 1 }, { unique: true });

export default mongoose.models.DocumentMember || mongoose.model('DocumentMember', DocumentMemberSchema);
