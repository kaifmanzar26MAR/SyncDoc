import mongoose from 'mongoose';

const PresenceSessionSchema = new mongoose.Schema(
  {
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    socketId: { type: String, required: true },
    color: { type: String, default: '#6366f1' },
    name: { type: String, default: 'Anonymous' },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

PresenceSessionSchema.index({ documentId: 1, lastSeenAt: 1 });

export default mongoose.models.PresenceSession || mongoose.model('PresenceSession', PresenceSessionSchema);
