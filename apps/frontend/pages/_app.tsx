import theme from '../lib/theme';
import { CssBaseline, Grow, ThemeProvider } from '@mui/material';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import { SnackbarProvider } from 'notistack';
import SnackbarCloseButton from '../components/general/snackbar-close-button';
import { RouteAuthorizer } from '../components/route-authorizer';

function CustomApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="theme-color" content="#fff" />
        <meta name="description" content="מערכת הבחירות של מחוז תל אביב" />
        <title>מחוז תל</title>
      </Head>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <SnackbarProvider
          maxSnack={3}
          TransitionComponent={Grow}
          action={(snackbarId) => (
            <SnackbarCloseButton snackbarId={snackbarId} />
          )}
        >
          <main className="app">
            <RouteAuthorizer>
              <Component {...pageProps} />
            </RouteAuthorizer>
          </main>
        </SnackbarProvider>
      </ThemeProvider>
    </>
  );
}

export default CustomApp;
