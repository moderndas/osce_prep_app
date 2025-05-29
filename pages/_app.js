import { ClerkProvider } from '@clerk/nextjs';
import '../styles/globals.css';
import { useEffect } from 'react';

export default function App({ Component, pageProps }) {
  // Set the theme to 'osce-warm'
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'osce-warm');
  }, []);

  return (
    <ClerkProvider>
      <Component {...pageProps} />
    </ClerkProvider>
  );
} 