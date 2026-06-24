import mongoose from 'mongoose';

const ParticipantSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    joinedAt: { type: Date, default: Date.now },
    leftAt: { type: Date, default: null },
  },
  { _id: false },
);

const EditSessionSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
      index: true,
    },
    status: { type: String, enum: ['active', 'closed'], default: 'active', index: true },
    startedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    baselineVersionId: { type: mongoose.Schema.Types.ObjectId, ref: 'DocumentVersion' },
    baselineVersion: { type: Number, required: true },
    latestVersionId: { type: mongoose.Schema.Types.ObjectId, ref: 'DocumentVersion' },
    latestVersion: { type: Number, required: true },
    participants: { type: [ParticipantSchema], default: [] },
    lastActivityAt: { type: Date, default: Date.now },
    lastSnapshotAt: { type: Date, default: null },
    closedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

EditSessionSchema.index({ documentId: 1, status: 1 });

export default mongoose.models.EditSession || mongoose.model('EditSession', EditSessionSchema);
