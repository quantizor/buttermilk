import Head from 'next/head';

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="theme-color" content="#8a0000" />
        <meta
          name="description"
          content="The lightweight, dead-simple, hyper customizable alternative to React Router. Designed for both client and server-side routing."
        />
        <meta
          name="keywords"
          content="react router, javascript, client side router, server side router, routing library"
        />
        <meta name="og:title" content="Buttermilk, a React routing library" />
        <meta name="og:description" content="Lightweight, simple, and works well both on the browser and server." />
        <meta name="twitter:image" content="https://buttermilk.js.org/favicon_retina.png" />
        <meta property="og:image" content="https://buttermilk.js.org/favicon_retina.png" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:creator" content="@probablyup" />
        <link rel="shortcut icon" href="/favicon.png" />

        <meta name="google-site-verification" content="P3Pt81s1_rvAzz4ZOv9xzwP64sTYIjndr3HjgJavNPw" />

        <script async src="https://www.googletagmanager.com/gtag/js?id=UA-91833843-2" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;
