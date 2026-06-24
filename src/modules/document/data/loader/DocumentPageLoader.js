import { getPageSession, requireSession, serializeSessionForProps } from '@shared/utils/session';
import { getDocumentForPage } from '@shared/data/services/document.service';

export async function loadDocumentPage(context) {
  const session = await getPageSession(context.req, context.res);
  const authRedirect = requireSession(session);
  if (authRedirect) return authRedirect;

  const { workspaceId, documentId } = context.params;
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
    },
  };
}
