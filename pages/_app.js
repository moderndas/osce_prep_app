import { ClerkProvider } from "@clerk/nextjs";
import "../styles/globals.css";
import { useEffect } from "react";

export default function App({ Component, pageProps }) {
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "osce-warm");
  }, []);

  return (
    <ClerkProvider {...pageProps}>
      <Component {...pageProps} />
    </ClerkProvider>
  );
}
