// Admin/src/features/docs/PublicOpenApiJsonPage.jsx
import React, { useEffect } from 'react';
import { generateOpenApiSpec } from './apiData';
import { supabaseUrl, supabaseAnonKey } from '../../core/supabase';

export default function PublicOpenApiJsonPage() {
  const spec = generateOpenApiSpec(supabaseUrl, supabaseAnonKey);
  const jsonString = JSON.stringify(spec, null, 2);

  useEffect(() => {
    document.title = 'openapi.json | Barangay Zapatera API';
  }, []);

  return (
    <pre
      style={{
        margin: 0,
        padding: '1.5rem',
        backgroundColor: '#0f172a',
        color: '#e2e8f0',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        fontSize: '13px',
        lineHeight: '1.6',
        minHeight: '100vh',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
    >
      {jsonString}
    </pre>
  );
}
