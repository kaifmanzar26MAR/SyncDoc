import { getPageSession, requireSession } from '@shared/utils/session';
import { getWorkspacesForUser } from '@shared/data/services/workspace.service';

export async function loadDashboardPage(context) {
  const session = await getPageSession(context.req, context.res);
  const authRedirect = requireSession(session);
  if (authRedirect) return authRedirect;

  const workspaces = await getWorkspacesForUser(session.user.id);

  return {
    props: {
      session,
      workspaces: JSON.parse(JSON.stringify(workspaces)),
    },
  };
}
