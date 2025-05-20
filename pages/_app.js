import { SessionProvider } from 'next-auth/react';
import '../styles/globals.css';
import { useEffect } from 'react';

export default function App({ Component, pageProps: { session, ...pageProps } }) {
  // Set the theme to 'osce-warm'
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'osce-warm');
  }, []);

  return (
    <SessionProvider session={session}>
      <Component {...pageProps} />
    </SessionProvider>
  );
} 