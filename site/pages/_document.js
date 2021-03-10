import Document, { Head, Html, Main, NextScript } from 'next/document';
import React from 'react';
import { ServerStyleSheet } from 'styled-components';

export default class MyDocument extends Document {
  static getInitialProps({ renderPage }) {
    const sheet = new ServerStyleSheet();

    const page = renderPage((App) => (props) => sheet.collectStyles(<App {...props} />));

    const styleTags = sheet.getStyleElement();

    return Object.assign({}, page, { styleTags });
  }

  render() {
    return (
      <Html>
        <Head>
          <link href="https://fonts.googleapis.com/css?family=Karma:400,600,700|Overpass+Mono|Vibur" rel="stylesheet" />
          <link href="/vendor/solarized-light.css" rel="stylesheet" />
          <script dangerouslySetInnerHTML={{ __html: GA }} />
          {this.props.styleTags}
        </Head>

        <body>
          <Main />
          <NextScript />

          <script src="/vendor/rainbow.min.js" />
          <script dangerouslySetInnerHTML={{ __html: Rainbow }} />
        </body>
      </Html>
    );
  }
}

const Rainbow = `
    Rainbow.addAlias('js', 'javascript');
    Rainbow.addAlias('jsx', 'javascript');
`;

const GA = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());

    gtag('config', 'UA-91833843-2');
`;
