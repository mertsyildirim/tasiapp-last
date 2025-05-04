import { SessionProvider } from 'next-auth/react';
import { Toaster } from 'react-hot-toast';
import { SpeedInsights } from "@vercel/speed-insights/next";
import Head from 'next/head';
import '../styles/globals.css';

function MyApp({ Component, pageProps: { session, ...pageProps } }) {
  return (
    <SessionProvider session={session}>
      <Head>
        <style jsx global>{`
          /* Kritik Tailwind CSS Stilleri */
          *, ::before, ::after {
            box-sizing: border-box;
            border-width: 0;
            border-style: solid;
            border-color: #e5e7eb;
          }
          body {
            margin: 0;
            line-height: inherit;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif;
          }
          .bg-white { background-color: #ffffff; }
          .bg-gray-50 { background-color: #f9fafb; }
          .bg-gray-100 { background-color: #f3f4f6; }
          .bg-blue-100 { background-color: #dbeafe; }
          .bg-green-100 { background-color: #dcfce7; }
          .bg-yellow-100 { background-color: #fef3c7; }
          .bg-purple-100 { background-color: #f3e8ff; }
          .bg-red-100 { background-color: #fee2e2; }
          .bg-orange-500 { background-color: #f97316; }
          .bg-orange-600 { background-color: #ea580c; }
          
          .text-white { color: #ffffff; }
          .text-gray-500 { color: #6b7280; }
          .text-gray-700 { color: #374151; }
          .text-gray-800 { color: #1f2937; }
          .text-gray-900 { color: #111827; }
          
          .rounded-full { border-radius: 9999px; }
          .rounded-lg { border-radius: 0.5rem; }
          .rounded-xl { border-radius: 0.75rem; }
          
          .shadow-sm { box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); }
          .shadow-md { box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
          
          .p-3 { padding: 0.75rem; }
          .p-4 { padding: 1rem; }
          .p-6 { padding: 1.5rem; }
          .px-4 { padding-left: 1rem; padding-right: 1rem; }
          .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
          
          .m-4 { margin: 1rem; }
          .mt-1 { margin-top: 0.25rem; }
          .ml-4 { margin-left: 1rem; }
          
          .flex { display: flex; }
          .grid { display: grid; }
          .items-center { align-items: center; }
          .justify-center { justify-content: center; }
          .justify-between { justify-content: space-between; }
          
          .h-screen { height: 100vh; }
          .min-h-screen { min-height: 100vh; }
          .w-full { width: 100%; }
          
          .gap-6 { gap: 1.5rem; }
          .space-y-6 > :not([hidden]) ~ :not([hidden]) { --tw-space-y-reverse: 0; margin-top: calc(1.5rem * calc(1 - var(--tw-space-y-reverse))); margin-bottom: calc(1.5rem * var(--tw-space-y-reverse)); }
          
          .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
          .text-lg { font-size: 1.125rem; line-height: 1.75rem; }
          .text-xl { font-size: 1.25rem; line-height: 1.75rem; }
          .text-2xl { font-size: 1.5rem; line-height: 2rem; }
          
          .font-medium { font-weight: 500; }
          .font-semibold { font-weight: 600; }
          .font-bold { font-weight: 700; }
          
          @media (min-width: 640px) {
            .sm\\:px-6 { padding-left: 1.5rem; padding-right: 1.5rem; }
          }
          
          @media (min-width: 768px) {
            .md\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          }
          
          @media (min-width: 1024px) {
            .lg\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
            .lg\\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
            .lg\\:px-8 { padding-left: 2rem; padding-right: 2rem; }
          }
          
          .animate-spin { animation: spin 1s linear infinite; }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </Head>
      <Component {...pageProps} />
      <Toaster position="top-right" />
      <SpeedInsights />
    </SessionProvider>
  );
}

export default MyApp; 