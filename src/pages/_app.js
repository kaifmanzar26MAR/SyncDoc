import Head from 'next/head';
import RootProviders from '@shared/components/layouts/RootProviders';
import '@/styles/globals.css';

export default function App({ Component, pageProps }) {
  const getLayout = Component.getLayout ?? ((page) => page);

  return (
    <RootProviders session={pageProps.session}>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      {getLayout(<Component {...pageProps} />)}
    </RootProviders>
  );
}
