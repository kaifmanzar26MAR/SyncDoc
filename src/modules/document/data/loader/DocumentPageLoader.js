import { getPageSession, requireSession } from '@shared/utils/session';
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
      session,
      workspaceId,
      documentId,
      initialDocument: JSON.parse(JSON.stringify(result.document)),
      userRole: result.role,
    },
  };
}
