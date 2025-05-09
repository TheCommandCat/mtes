import theme from '../lib/theme';
import { CssBaseline, Grow, ThemeProvider } from '@mui/material';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import { SnackbarProvider } from 'notistack';
import SnackbarCloseButton from '../components/general/snackbar-close-button';
import { RouteAuthorizer } from '../components/route-authorizer';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import rtlPlugin from 'stylis-plugin-rtl';

// Create rtl cache
const cacheRtl = createCache({
  key: 'mui-rtl',
  stylisPlugins: [rtlPlugin]
});

function CustomApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="theme-color" content="#fff" />
        <meta name="description" content="מערכת הבחירות של מחוז תל אביב" />
        <title>מערכת בחירות מחוז תל אביב</title>
      </Head>
      <CacheProvider value={cacheRtl}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <SnackbarProvider
            maxSnack={3}
            TransitionComponent={Grow}
            action={snackbarId => <SnackbarCloseButton snackbarId={snackbarId} />}
          >
            <main className="app">
              <RouteAuthorizer>
                <Component {...pageProps} />
              </RouteAuthorizer>
            </main>
          </SnackbarProvider>
        </ThemeProvider>
      </CacheProvider>
    </>
  );
}

export default CustomApp;
