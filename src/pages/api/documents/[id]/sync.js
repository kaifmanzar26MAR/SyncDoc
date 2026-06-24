import * as Y from 'yjs';
import { requireApiSession } from '@shared/utils/api-auth';
import { connectDB } from '@shared/lib/db/mongoose';
import { Document, SyncOperation } from '@shared/data/models';
import { authorizeDocument, canSync } from '@shared/lib/security/authorize';
import {
  syncBatchSchema,
  validateBodySize,
  sanitizeHtml,
  MAX_YJS_UPDATE_BYTES,
} from '@shared/lib/validations/schemas';
import { rateLimit } from '@shared/lib/security/rate-limit';
import { getClientIpFromReq, sendJson, methodNotAllowed } from '@shared/utils/api-response';
import { formatApiError } from '@shared/utils/format-api-error';
import { broadcastDocumentChange } from '@shared/lib/socket/broadcast';
import { logDocumentChange } from '@document/data/service/edit-session.service';

function validateYjsUpdate(base64) {
  if (!base64) return true;
  const buf = Buffer.from(base64, 'base64');
  if (buf.length > MAX_YJS_UPDATE_BYTES) return false;
  try {
    const doc = new Y.Doc();
    Y.applyUpdate(doc, new Uint8Array(buf));
    return true;
  } catch {
    return false;
  }
}

function validationErrorMessage(parsed) {
  const flattened = parsed.error.flatten();
  const fieldErrors = Object.values(flattened.fieldErrors || {}).flat();
  const first = flattened.formErrors?.[0] || fieldErrors[0];
  if (typeof first === 'string' && /too big/i.test(first)) {
    return 'Sync batch is too large. Please try again.';
  }
  return first || 'Invalid sync payload';
}

function isValidObjectId(value) {
  return typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);
}

export default async function handler(req, res) {
  const { id } = req.query;
  const session = await requireApiSession(req, res);
  if (!session) return;

  if (req.method === 'GET') {
    try {
      const authz = await authorizeDocument(session.user.id, id, 'read');
      if (!authz.authorized) return sendJson(res, authz.status, { error: authz.error });

      const since = Number(req.query.since || 0);
      await connectDB();
      const remoteOperations = await SyncOperation.find({
        documentId: id,
        logicalClock: { $gt: since },
      })
        .sort({ logicalClock: 1 })
        .limit(100)
        .lean();

      const doc = await Document.findById(id).lean();
      if (!doc) return sendJson(res, 404, { error: 'Not found' });

      const lastPullClock = remoteOperations.length
        ? remoteOperations[remoteOperations.length - 1].logicalClock
        : since;

      return sendJson(res, 200, {
        remoteOperations,
        lastPullClock,
        document: {
          title: doc.title,
          content: doc.content,
          yjsState: doc.yjsState ? Buffer.from(doc.yjsState).toString('base64') : null,
          currentVersion: doc.currentVersion,
        },
      });
    } catch (err) {
      console.error('[sync] GET error:', err);
      return sendJson(res, 503, { error: 'Database unavailable' });
    }
  }

  if (req.method === 'POST') {
    try {
      const authz = await authorizeDocument(session.user.id, id, 'sync');
      if (!authz.authorized) return sendJson(res, authz.status, { error: authz.error });
      if (!canSync(authz.role)) return sendJson(res, 403, { error: 'Viewers cannot sync' });

      const limit = await rateLimit(getClientIpFromReq(req));
      if (!limit.success) return sendJson(res, 429, { error: 'Rate limit exceeded' });

      try {
        validateBodySize(req.body);
      } catch (err) {
        return sendJson(res, 413, { error: err.message });
      }

      const parsed = syncBatchSchema.safeParse(req.body);
      if (!parsed.success) {
        return sendJson(res, 400, { error: validationErrorMessage(parsed) });
      }

      await connectDB();
      const doc = await Document.findById(id);
      if (!doc) return sendJson(res, 404, { error: 'Not found' });

      const applied = [];
      let lastClock = parsed.data.lastPullClock;
      const editSessionId = isValidObjectId(parsed.data.sessionId) ? parsed.data.sessionId : null;

      for (const op of parsed.data.operations) {
        if (op.operationType === 'YJS_UPDATE' && !validateYjsUpdate(op.payload?.yjsState)) continue;

        try {
          await SyncOperation.create({
            documentId: id,
            clientId: op.clientId,
            operationType: op.operationType,
            payload: op.payload,
            logicalClock: op.logicalClock,
            idempotencyKey: op.idempotencyKey,
            userId: session.user.id,
            sessionId: editSessionId,
            synced: true,
          });
          applied.push(op);

          if (
            editSessionId &&
            ['CONTENT_UPDATE', 'TITLE_UPDATE', 'RESTORE'].includes(op.operationType)
          ) {
            await logDocumentChange({
              documentId: id,
              sessionId: editSessionId,
              userId: session.user.id,
              operationType: op.operationType,
              payload: op.payload,
              logicalClock: op.logicalClock,
            });
          }

          if (op.operationType === 'CONTENT_UPDATE' && op.payload?.content !== undefined) {
            doc.content = sanitizeHtml(op.payload.content);
          }
          if (op.operationType === 'TITLE_UPDATE' && op.payload?.title) {
            doc.title = op.payload.title;
          }
          if (op.operationType === 'YJS_UPDATE' && op.payload?.yjsState) {
            const update = Buffer.from(op.payload.yjsState, 'base64');
            const ydoc = new Y.Doc();
            if (doc.yjsState) Y.applyUpdate(ydoc, new Uint8Array(doc.yjsState));
            Y.applyUpdate(ydoc, new Uint8Array(update));
            doc.yjsState = Buffer.from(Y.encodeStateAsUpdate(ydoc));
          }
          lastClock = Math.max(lastClock, op.logicalClock);
        } catch (err) {
          if (err.code !== 11000) throw err;
        }
      }

      await doc.save();

      if (applied.length) {
        broadcastDocumentChange(id, session.user.id, {
          operationType: 'SYNC',
          title: doc.title,
          content: doc.content,
        });
      }

      const remoteOperations = await SyncOperation.find({
        documentId: id,
        logicalClock: { $gt: parsed.data.lastPullClock },
        clientId: { $ne: parsed.data.operations[0]?.clientId },
      })
        .sort({ logicalClock: 1 })
        .limit(50)
        .lean();

      return sendJson(res, 200, {
        applied: applied.length,
        lastClock,
        lastPullClock: remoteOperations.length
          ? remoteOperations[remoteOperations.length - 1].logicalClock
          : lastClock,
        remoteOperations,
        document: {
          title: doc.title,
          content: doc.content,
          yjsState: doc.yjsState ? Buffer.from(doc.yjsState).toString('base64') : null,
          currentVersion: doc.currentVersion,
        },
      });
    } catch (err) {
      console.error('[sync] POST error:', err);
      const errorMessage = formatApiError(err);
      const status = /unavailable|ENOTFOUND|MongoServerSelection/i.test(errorMessage) ? 503 : 500;
      return sendJson(res, status, { error: errorMessage || 'Sync failed' });
    }
  }

  return methodNotAllowed(res, ['GET', 'POST']);
}
