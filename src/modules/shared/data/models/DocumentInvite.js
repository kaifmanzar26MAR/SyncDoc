import mongoose from 'mongoose';

const DocumentInviteSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
      index: true,
    },
    email: { type: String, required: true, lowercase: true, trim: true },
    role: { type: String, enum: ['EDITOR', 'VIEWER'], required: true },
    invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

DocumentInviteSchema.index({ documentId: 1, email: 1 }, { unique: true });

export default mongoose.models.DocumentInvite || mongoose.model('DocumentInvite', DocumentInviteSchema);
