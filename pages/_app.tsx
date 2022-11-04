import "../styles/globals.css";
import type { AppProps } from "next/app";
import "../src/app/otel/tracer";

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
