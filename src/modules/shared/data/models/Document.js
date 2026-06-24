import mongoose from 'mongoose';

const DocumentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, default: 'Untitled', trim: true },
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    content: { type: String, default: '' },
    yjsState: { type: Buffer, default: null },
    currentVersion: { type: Number, default: 1 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    shareLinkEnabled: { type: Boolean, default: true },
    shareLinkToken: { type: String, unique: true, sparse: true, index: true },
    shareLinkRole: { type: String, enum: ['VIEWER'], default: 'VIEWER' },
  },
  { timestamps: true }
);

DocumentSchema.index({ workspaceId: 1, updatedAt: -1 });

export default mongoose.models.Document || mongoose.model('Document', DocumentSchema);
