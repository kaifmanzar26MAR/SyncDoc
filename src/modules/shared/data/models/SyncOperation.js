import mongoose from 'mongoose';

const SyncOperationSchema = new mongoose.Schema(
  {
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true, index: true },
    clientId: { type: String, required: true },
    operationType: { type: String, required: true },
    payload: { type: mongoose.Schema.Types.Mixed, required: true },
    logicalClock: { type: Number, required: true },
    synced: { type: Boolean, default: true },
    idempotencyKey: { type: String, required: true },
  },
  { timestamps: true }
);

SyncOperationSchema.index({ documentId: 1, idempotencyKey: 1 }, { unique: true });
SyncOperationSchema.index({ documentId: 1, logicalClock: 1 });

export default mongoose.models.SyncOperation || mongoose.model('SyncOperation', SyncOperationSchema);
