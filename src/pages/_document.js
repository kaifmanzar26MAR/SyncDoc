import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'SyncDoc',
    applicationCategory: 'BusinessApplication',
    description: 'Local-first collaborative document editor with offline sync',
    operatingSystem: 'Web',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  };

  return (
    <Html lang="en">
      <Head>
        <meta name="description" content="Local-first collaborative document platform with offline sync" />
        <meta property="og:title" content="SyncDoc — Local-First Collaborative Documents" />
        <meta property="og:description" content="Edit documents offline. Sync when online." />
        <meta property="og:type" content="website" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </Head>
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
