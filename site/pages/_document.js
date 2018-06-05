import Document, { Head, Main } from 'next/document';
import React from 'react';
import { ServerStyleSheet } from 'styled-components';

export default class MyDocument extends Document {
    static getInitialProps({ renderPage }) {
        const sheet = new ServerStyleSheet();

        const page = renderPage(App => props =>
            sheet.collectStyles(<App {...props} />),
        );

        const styleTags = sheet.getStyleElement();

        return Object.assign({}, page, { styleTags });
    }

    render() {
        return (
            <html>
                <Head>
                    <meta charSet="utf-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
                    <meta name="theme-color" content="#8a0000" />
                    <meta name="description" content="Beautifully simple routing for React JavaScript projects. Lightweight and works well both on the browser and server." />
                    <meta name="og:title" content="Buttermilk, a React routing library" />
                    <meta name="og:description" content="Lightweight, simple, and works well both on the browser and server." />
                    <meta name="twitter:image" content="https://buttermilk.js.org/favicon_retina.png" />
                    <meta property="og:image" content="https://buttermilk.js.org/favicon_retina.png" />
                    <meta name="twitter:card" content="summary" />
                    <meta name="twitter:creator" content="@probablyup" />
                    <link rel="shortcut icon" href="/static/favicon.png" />
                    <title>Buttermilk</title>

                    <link href="https://fonts.googleapis.com/css?family=Karma:400,600,700|Overpass+Mono|Vibur" rel="stylesheet" />
                    <link href="/static/vendor/solarized-light.css" rel="stylesheet" />

                    <script async src="https://www.googletagmanager.com/gtag/js?id=UA-91833843-2"></script>
                    <script dangerouslySetInnerHTML={{ __html: GA }} />
                    {this.props.styleTags}
                </Head>

                <body>
                    <Main />

                    <script src="/static/vendor/rainbow.min.js"></script>
                    <script dangerouslySetInnerHTML={{ __html: Rainbow }} />
                </body>
            </html>
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
