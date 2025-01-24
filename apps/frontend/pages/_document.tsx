import { Html, Head, Main, NextScript } from 'next/document';
import theme from '../lib/theme';

export default function Document() {
  return (
    <Html lang="he">
      <Head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css?family=Roboto:300,400,500,700&display=swap"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css?family=Roboto+Mono:300,400,500,700&display=swap"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;700;800&display=swap"
          rel="stylesheet"
        />
      </Head>
      <body dir={theme.direction}>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
