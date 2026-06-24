import mongoose from 'mongoose';

const DocumentChangeLogSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
      index: true,
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EditSession',
      required: true,
      index: true,
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    operationType: { type: String, required: true },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
    logicalClock: { type: Number, default: 0 },
  },
  { timestamps: true },
);

DocumentChangeLogSchema.index({ sessionId: 1, createdAt: 1 });

export default mongoose.models.DocumentChangeLog ||
  mongoose.model('DocumentChangeLog', DocumentChangeLogSchema);
