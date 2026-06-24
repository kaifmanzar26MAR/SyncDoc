import mongoose from 'mongoose';

const DocumentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, default: 'Untitled', trim: true },
    workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    content: { type: String, default: '' },
    yjsState: { type: Buffer, default: null },
    currentVersion: { type: Number, default: 1 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

DocumentSchema.index({ workspaceId: 1, updatedAt: -1 });

export default mongoose.models.Document || mongoose.model('Document', DocumentSchema);
