export function broadcastDocumentChange(documentId, userId, payload) {
  const io = globalThis.__syncdoc_io;
  if (!io) return;

  io.to(`document:${documentId}`).emit('doc:change', {
    documentId,
    userId,
    updatedAt: new Date().toISOString(),
    ...payload,
  });
}
