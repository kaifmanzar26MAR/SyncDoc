import { getPageSession, requireSession, serializeSessionForProps } from '@shared/utils/session';
import { getDocumentForPage } from '@shared/data/services/document.service';

function isDatabaseUnavailable(err) {
  const name = err?.name || '';
  const message = err?.message || '';
  return (
    name === 'MongoServerSelectionError' ||
    name === 'MongoNetworkError' ||
    /ENOTFOUND|ECONNREFUSED|ETIMEDOUT|MongoServerSelection/i.test(message)
  );
}

export async function loadDocumentPage(context) {
  const session = await getPageSession(context.req, context.res);
  const authRedirect = requireSession(session);
  if (authRedirect) return authRedirect;

  const { workspaceId, documentId } = context.params;

  try {
    const result = await getDocumentForPage(documentId, session.user.id);

    if (!result) {
      return { notFound: true };
    }

    return {
      props: {
        session: serializeSessionForProps(session),
        workspaceId,
        documentId,
        initialDocument: JSON.parse(JSON.stringify(result.document)),
        userRole: result.role,
        pageLoadWarning: null,
      },
    };
  } catch (err) {
    if (!isDatabaseUnavailable(err)) {
      throw err;
    }

    return {
      props: {
        session: serializeSessionForProps(session),
        workspaceId,
        documentId,
        initialDocument: null,
        userRole: 'EDITOR',
        pageLoadWarning:
          'Could not reach the server. Showing your last saved copy — changes will sync when you are back online.',
      },
    };
  }
}
