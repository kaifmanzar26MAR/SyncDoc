import mongoose from 'mongoose';

const DocumentVersionSchema = new mongoose.Schema(
  {
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true, index: true },
    version: { type: Number, required: true },
    snapshot: {
      title: String,
      content: String,
      yjsState: Buffer,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    label: { type: String, default: '' },
    restoreOf: { type: Number, default: null },
  },
  { timestamps: true }
);

DocumentVersionSchema.index({ documentId: 1, version: -1 });

export default mongoose.models.DocumentVersion || mongoose.model('DocumentVersion', DocumentVersionSchema);
