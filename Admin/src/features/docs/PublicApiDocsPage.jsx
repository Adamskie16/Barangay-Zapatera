// Admin/src/features/docs/PublicApiDocsPage.jsx
import React, { useEffect } from 'react';
import ApiDocsView from './ApiDocsView';

export default function PublicApiDocsPage() {
  useEffect(() => {
    document.title = 'Barangay Zapatera API Documentation | OAS 3.1';
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-800 font-sans flex flex-col">
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-8 sm:py-12">
        <ApiDocsView />
      </main>
    </div>
  );
}
