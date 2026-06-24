import { getPageSession } from '@shared/utils/session';
import {
  resolveShareToken,
  grantViewerAccessFromShareLink,
} from '@document/data/service/share.service';

export async function getServerSideProps(context) {
  const { token } = context.params;
  const callbackUrl = `/share/${token}`;

  const session = await getPageSession(context.req, context.res);
  if (!session?.user?.id) {
    return {
      redirect: {
        destination: `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`,
        permanent: false,
      },
    };
  }

  const resolved = await resolveShareToken(token);
  if (!resolved) return { notFound: true };

  await grantViewerAccessFromShareLink(session.user.id, resolved.documentId);

  return {
    redirect: {
      destination: `/workspace/${resolved.workspaceId}/document/${resolved.documentId}`,
      permanent: false,
    },
  };
}

export default function ShareRedirectPage() {
  return null;
}
