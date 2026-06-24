import Head from 'next/head';
import DashboardShell from '@dashboard/components/DashboardShell';
import DashboardView from '@dashboard/views/DashboardView';
import { loadDashboardPage } from '@dashboard/data/loader/DashboardPageLoader';

export default function DashboardPage({ workspaces }) {
  return (
    <>
      <Head>
        <title>Dashboard | SyncDoc</title>
      </Head>
      <DashboardView workspaces={workspaces} />
    </>
  );
}

DashboardPage.getLayout = function getLayout(page) {
  return (
    <DashboardShell initialWorkspaces={page.props.workspaces}>{page}</DashboardShell>
  );
};

export const getServerSideProps = loadDashboardPage;
