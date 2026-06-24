import Head from 'next/head';
import DocumentShell from '@document/components/DocumentShell';
import { loadDocumentPage } from '@document/data/loader/DocumentPageLoader';

export default function DocumentPage({
  workspaceId,
  documentId,
  initialDocument,
  userRole,
  pageLoadWarning,
}) {
  return (
    <>
      <Head>
        <title>{initialDocument?.title || 'Document'} | SyncDoc</title>
      </Head>
      <DocumentShell
        documentId={documentId}
        workspaceId={workspaceId}
        initialDocument={initialDocument}
        userRole={userRole}
        pageLoadWarning={pageLoadWarning}
      />
    </>
  );
}

export const getServerSideProps = loadDocumentPage;
