export async function getServerSideProps(context) {
  const { getPageSession } = await import('@shared/utils/session');
  const session = await getPageSession(context.req, context.res);
  if (session?.user) {
    return { redirect: { destination: '/dashboard', permanent: false } };
  }
  return { redirect: { destination: '/login', permanent: false } };
}

export default function Home() {
  return null;
}
