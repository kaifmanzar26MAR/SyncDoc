import Head from 'next/head';
import DocumentsView from '@dashboard/views/DocumentsView';
import DashboardShell from '@dashboard/components/DashboardShell';
import { loadDashboardPage } from '@dashboard/data/loader/DashboardPageLoader';

export default function DocumentsPage({ workspaces }) {
  return (
    <>
      <Head>
        <title>Documents | SyncDoc</title>
      </Head>
      <DocumentsView workspaces={workspaces} />
    </>
  );
}

DocumentsPage.getLayout = function getLayout(page) {
  return (
    <DashboardShell initialWorkspaces={page.props.workspaces}>{page}</DashboardShell>
  );
};

export const getServerSideProps = loadDashboardPage;
