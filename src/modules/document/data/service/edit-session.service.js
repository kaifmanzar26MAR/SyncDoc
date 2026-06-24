import { connectDB } from '@shared/lib/db/mongoose';
import {
  Document,
  DocumentVersion,
  EditSession,
  DocumentChangeLog,
} from '@shared/data/models';
import { authorizeDocument, canEdit } from '@shared/lib/security/authorize';

function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function summarizeChangePayload(operationType, payload = {}) {
  if (operationType === 'TITLE_UPDATE') {
    return { field: 'title', title: payload.title || '' };
  }
  if (operationType === 'CONTENT_UPDATE') {
    const text = stripHtml(payload.content || '');
    return {
      field: 'content',
      contentLength: (payload.content || '').length,
      preview: text.slice(0, 120),
    };
  }
  if (operationType === 'RESTORE') {
    return { field: 'restore', restoreOf: payload.restoreOf };
  }
  return payload;
}

function serializeSession(session) {
  if (!session) return null;
  return {
    sessionId: session._id.toString(),
    documentId: session.documentId.toString(),
    status: session.status,
    baselineVersion: session.baselineVersion,
    latestVersion: session.latestVersion,
    participants: (session.participants || []).map((p) => ({
      userId: p.userId?.toString?.() || p.userId,
      joinedAt: p.joinedAt,
      leftAt: p.leftAt,
    })),
    lastActivityAt: session.lastActivityAt,
    lastSnapshotAt: session.lastSnapshotAt,
    startedAt: session.createdAt,
  };
}

async function createVersionSnapshot({
  documentId,
  doc,
  userId,
  sessionId,
  snapshotType,
  label,
}) {
  const newVersionNum = doc.currentVersion + 1;
  const versionDoc = await DocumentVersion.create({
    documentId,
    sessionId,
    version: newVersionNum,
    snapshot: { title: doc.title, content: doc.content, yjsState: doc.yjsState },
    createdBy: userId,
    label,
    snapshotType,
  });

  doc.currentVersion = newVersionNum;
  await doc.save();

  return { versionDoc, newVersionNum };
}

export async function getOrJoinActiveSession(documentId, userId) {
  const authz = await authorizeDocument(userId, documentId, 'edit');
  if (!authz.authorized || !canEdit(authz.role)) {
    return null;
  }

  await connectDB();

  let session = await EditSession.findOne({ documentId, status: 'active' });

  if (!session) {
    const doc = await Document.findById(documentId);
    if (!doc) throw new Error('Document not found');

    const { versionDoc, newVersionNum } = await createVersionSnapshot({
      documentId,
      doc,
      userId,
      sessionId: null,
      snapshotType: 'session_start',
      label: 'Session started',
    });

    session = await EditSession.create({
      documentId,
      status: 'active',
      startedBy: userId,
      baselineVersionId: versionDoc._id,
      baselineVersion: newVersionNum,
      latestVersionId: versionDoc._id,
      latestVersion: newVersionNum,
      participants: [{ userId, joinedAt: new Date() }],
      lastActivityAt: new Date(),
      lastSnapshotAt: new Date(),
    });

    versionDoc.sessionId = session._id;
    await versionDoc.save();
  } else {
    const participant = session.participants.find(
      (p) => p.userId.toString() === userId.toString(),
    );
    if (!participant) {
      session.participants.push({ userId, joinedAt: new Date() });
    } else if (participant.leftAt) {
      participant.leftAt = null;
      participant.joinedAt = new Date();
    }
    session.lastActivityAt = new Date();
    await session.save();
  }

  return serializeSession(session);
}

export async function leaveEditSession(documentId, userId, sessionId) {
  await connectDB();

  const session = await EditSession.findOne({
    _id: sessionId,
    documentId,
    status: 'active',
  });
  if (!session) return null;

  const participant = session.participants.find(
    (p) => p.userId.toString() === userId.toString(),
  );
  if (participant) {
    participant.leftAt = new Date();
  }
  await session.save();

  const activeParticipants = session.participants.filter((p) => !p.leftAt);
  if (activeParticipants.length === 0) {
    await closeEditSession(documentId, session._id.toString(), userId);
  }

  return serializeSession(session);
}

export async function touchEditSession(sessionId) {
  await connectDB();
  await EditSession.updateOne(
    { _id: sessionId, status: 'active' },
    { $set: { lastActivityAt: new Date() } },
  );
}

export async function commitSessionSnapshot(documentId, sessionId, userId) {
  const authz = await authorizeDocument(userId, documentId, 'edit');
  if (!authz.authorized || !canEdit(authz.role)) {
    throw new Error('Permission denied');
  }

  await connectDB();

  const session = await EditSession.findOne({ _id: sessionId, documentId, status: 'active' });
  if (!session) return null;

  const doc = await Document.findById(documentId);
  if (!doc) throw new Error('Document not found');

  if (session.latestVersion === doc.currentVersion) {
    session.lastActivityAt = new Date();
    await session.save();
    return { skipped: true, session: serializeSession(session) };
  }

  const { versionDoc, newVersionNum } = await createVersionSnapshot({
    documentId,
    doc,
    userId,
    sessionId: session._id,
    snapshotType: 'session_auto',
    label: 'Auto snapshot',
  });

  session.latestVersionId = versionDoc._id;
  session.latestVersion = newVersionNum;
  session.lastSnapshotAt = new Date();
  session.lastActivityAt = new Date();
  await session.save();

  return {
    skipped: false,
    version: newVersionNum,
    session: serializeSession(session),
  };
}

export async function closeEditSession(documentId, sessionId, userId) {
  await connectDB();

  const session = await EditSession.findOne({ _id: sessionId, documentId, status: 'active' });
  if (!session) return null;

  const doc = await Document.findById(documentId);
  if (!doc) return null;

  if (session.latestVersion !== doc.currentVersion) {
    const { versionDoc, newVersionNum } = await createVersionSnapshot({
      documentId,
      doc,
      userId,
      sessionId: session._id,
      snapshotType: 'session_end',
      label: 'Session ended',
    });
    session.latestVersionId = versionDoc._id;
    session.latestVersion = newVersionNum;
  }

  session.status = 'closed';
  session.closedAt = new Date();
  session.lastActivityAt = new Date();
  await session.save();

  return serializeSession(session);
}

export async function logDocumentChange({
  documentId,
  sessionId,
  userId,
  operationType,
  payload,
  logicalClock,
}) {
  if (!sessionId || !userId) return;

  await connectDB();

  const session = await EditSession.findOne({ _id: sessionId, documentId, status: 'active' });
  if (!session) return;

  await DocumentChangeLog.create({
    documentId,
    sessionId,
    userId,
    operationType,
    payload: summarizeChangePayload(operationType, payload),
    logicalClock: logicalClock || 0,
  });

  session.lastActivityAt = new Date();
  await session.save();
}

export async function getSessionChangeLogs(sessionId) {
  await connectDB();

  const logs = await DocumentChangeLog.find({ sessionId })
    .sort({ createdAt: 1 })
    .populate('userId', 'name email')
    .lean();

  const byUser = new Map();

  logs.forEach((log) => {
    const uid = log.userId?._id?.toString() || log.userId?.toString();
    if (!byUser.has(uid)) {
      byUser.set(uid, {
        userId: uid,
        name: log.userId?.name || null,
        email: log.userId?.email || '',
        changes: [],
      });
    }
    byUser.get(uid).changes.push({
      _id: log._id.toString(),
      operationType: log.operationType,
      payload: log.payload,
      logicalClock: log.logicalClock,
      createdAt: log.createdAt,
    });
  });

  return {
    sessionId,
    totalChanges: logs.length,
    users: [...byUser.values()],
    logs: logs.map((log) => ({
      _id: log._id.toString(),
      userId: log.userId?._id?.toString(),
      userName: log.userId?.name || log.userId?.email,
      userEmail: log.userId?.email,
      operationType: log.operationType,
      payload: log.payload,
      logicalClock: log.logicalClock,
      createdAt: log.createdAt,
    })),
  };
}

export async function getVersionsWithSessions(documentId) {
  await connectDB();

  const versions = await DocumentVersion.find({ documentId })
    .sort({ version: -1 })
    .limit(50)
    .populate('createdBy', 'name email')
    .lean();

  const sessionIds = [
    ...new Set(versions.filter((v) => v.sessionId).map((v) => v.sessionId.toString())),
  ];

  const sessions = sessionIds.length
    ? await EditSession.find({ _id: { $in: sessionIds } }).lean()
    : [];

  const sessionMap = new Map(sessions.map((s) => [s._id.toString(), s]));

  const versionsWithMeta = await Promise.all(
    versions.map(async (v) => {
      const sessionId = v.sessionId?.toString();
      let changeSummary = null;
      if (sessionId && ['session_auto', 'session_end'].includes(v.snapshotType)) {
        const logs = await DocumentChangeLog.find({
          sessionId,
          createdAt: { $lte: v.updatedAt || v.createdAt },
        })
          .sort({ createdAt: -1 })
          .limit(20)
          .populate('userId', 'name email')
          .lean();

        const userCounts = {};
        logs.forEach((log) => {
          const key = log.userId?.email || log.userId?._id?.toString();
          userCounts[key] = (userCounts[key] || 0) + 1;
        });

        changeSummary = {
          totalChanges: logs.length,
          byUser: Object.entries(userCounts).map(([email, count]) => ({ email, count })),
        };
      }

      return {
        _id: v._id.toString(),
        version: v.version,
        label: v.label,
        snapshotType: v.snapshotType,
        sessionId,
        restoreOf: v.restoreOf,
        createdAt: v.createdAt,
        createdBy: v.createdBy
          ? {
              _id: v.createdBy._id?.toString(),
              name: v.createdBy.name,
              email: v.createdBy.email,
            }
          : null,
        snapshot: { title: v.snapshot?.title, content: v.snapshot?.content },
        session: sessionId ? serializeSession(sessionMap.get(sessionId) || null) : null,
        changeSummary,
      };
    }),
  );

  return versionsWithMeta;
}
