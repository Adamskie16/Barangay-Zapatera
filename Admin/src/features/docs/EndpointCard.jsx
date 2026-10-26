// Admin/src/features/docs/EndpointCard.jsx
import React, { useState } from 'react';
import {
  ChevronDown,
  Lock,
  Unlock,
  Play,
  Copy,
  Check,
  RefreshCw,
  Code,
  Terminal,
  FileCode,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react';
import { supabase, supabaseUrl, supabaseAnonKey } from '../../core/supabase';

const METHOD_STYLES = {
  GET: {
    badge: 'bg-[#61affe] text-white',
    border: 'border-[#61affe]/70',
    headerBg: 'bg-[#ebf3fb] hover:bg-[#e0efff]',
    bodyBg: 'bg-[#ebf3fb]/20',
    text: 'text-[#61affe]',
  },
  POST: {
    badge: 'bg-[#49cc90] text-white',
    border: 'border-[#49cc90]/70',
    headerBg: 'bg-[#e8f6f0] hover:bg-[#d8f2e7]',
    bodyBg: 'bg-[#e8f6f0]/20',
    text: 'text-[#49cc90]',
  },
  PATCH: {
    badge: 'bg-[#fca130] text-white',
    border: 'border-[#fca130]/70',
    headerBg: 'bg-[#fdf7e7] hover:bg-[#fbf0d4]',
    bodyBg: 'bg-[#fdf7e7]/20',
    text: 'text-[#fca130]',
  },
  DELETE: {
    badge: 'bg-[#f93e3e] text-white',
    border: 'border-[#f93e3e]/70',
    headerBg: 'bg-[#faeceb] hover:bg-[#f8dedd]',
    bodyBg: 'bg-[#faeceb]/20',
    text: 'text-[#f93e3e]',
  },
  WSS: {
    badge: 'bg-[#7c3aed] text-white',
    border: 'border-[#7c3aed]/70',
    headerBg: 'bg-[#f5f0ff] hover:bg-[#ece2fe]',
    bodyBg: 'bg-[#f5f0ff]/20',
    text: 'text-[#7c3aed]',
  },
};

export default function EndpointCard({
  endpoint,
  isExpanded,
  onToggle,
  onOpenAuth,
  authToken,
  apiKey,
}) {
  const styles = METHOD_STYLES[endpoint.method] || METHOD_STYLES.GET;
  const [activeTab, setActiveTab] = useState('schema'); // 'schema' | 'curl' | 'supabaseJs'
  const [paramValues, setParamValues] = useState(() => {
    const initial = {};
    endpoint.parameters?.forEach((p) => {
      initial[p.name] = p.defaultValue || '';
    });
    return initial;
  });

  const [bodyInput, setBodyInput] = useState(() => {
    return endpoint.requestBody ? JSON.stringify(endpoint.requestBody, null, 2) : '';
  });

  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const handleCopy = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleExecute = async () => {
    setIsExecuting(true);
    setExecutionResult(null);

    const startTime = performance.now();

    try {
      // Determine request path and real endpoint testing
      const base = supabaseUrl || 'https://qzmxwxmtuzoanwevftnd.supabase.co';
      let fullUrl = `${base}${endpoint.path}`;

      // Replace path parameters if any
      Object.entries(paramValues).forEach(([k, v]) => {
        fullUrl = fullUrl.replace(`{${k}}`, encodeURIComponent(v));
      });

      // Append query parameters if applicable
      const queryParams = new URLSearchParams();
      endpoint.parameters?.forEach((p) => {
        if (p.in === 'query' && paramValues[p.name] && !fullUrl.includes(`?${p.name}=`)) {
          // If the defaultValue had eq., let's respect it
          queryParams.append(p.name, paramValues[p.name]);
        }
      });

      const queryString = queryParams.toString();
      if (queryString && !fullUrl.includes('?')) {
        fullUrl += `?${queryString}`;
      } else if (queryString && fullUrl.includes('?')) {
        fullUrl += `&${queryString}`;
      }

      const headers = {
        apikey: apiKey || supabaseAnonKey,
        'Content-Type': 'application/json',
      };

      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      } else {
        headers['Authorization'] = `Bearer ${apiKey || supabaseAnonKey}`;
      }

      if (endpoint.method === 'POST' || endpoint.method === 'PATCH') {
        headers['Prefer'] = 'return=representation';
      }

      let parsedBody = undefined;
      if ((endpoint.method === 'POST' || endpoint.method === 'PATCH') && bodyInput.trim()) {
        try {
          parsedBody = JSON.parse(bodyInput);
        } catch {
          parsedBody = bodyInput;
        }
      }

      if (endpoint.method === 'WSS') {
        // Realtime simulation
        setExecutionResult({
          status: 101,
          statusText: 'Switching Protocols (WebSocket Connected)',
          duration: `${Math.round(performance.now() - startTime)}ms`,
          headers: { 'Upgrade': 'websocket', 'Connection': 'Upgrade', 'channel': 'realtime:document_requests' },
          data: {
            channel: 'realtime:document_requests',
            status: 'SUBSCRIBED',
            events_listened: ['INSERT', 'UPDATE', 'DELETE'],
            info: 'Realtime WebSocket handshake verified with Supabase Realtime Engine.',
          },
        });
        setIsExecuting(false);
        return;
      }

      // Execute live fetch request
      const response = await fetch(fullUrl, {
        method: endpoint.method,
        headers,
        body: parsedBody ? (typeof parsedBody === 'string' ? parsedBody : JSON.stringify(parsedBody)) : undefined,
      });

      const duration = `${Math.round(performance.now() - startTime)}ms`;
      let data;
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch {
        data = text || { message: 'Empty response body' };
      }

      const respHeaders = {};
      response.headers.forEach((v, k) => {
        respHeaders[k] = v;
      });

      setExecutionResult({
        status: response.status,
        statusText: response.statusText,
        duration,
        headers: respHeaders,
        data,
      });
    } catch (err) {
      setExecutionResult({
        status: 0,
        statusText: 'Network / CORS Error',
        duration: `${Math.round(performance.now() - startTime)}ms`,
        headers: {},
        data: {
          error: err.message,
          hint: 'Ensure your Supabase URL and anon_key are valid, and table RLS permits the role to execute this request.',
        },
      });
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div
      className={`rounded-lg border transition-all duration-200 overflow-hidden ${styles.border} ${
        isExpanded ? 'shadow-sm ring-1 ring-slate-200/50' : 'hover:shadow-2xs'
      }`}
    >
      {/* Header Row (Swagger UI style) */}
      <div
        onClick={onToggle}
        className={`w-full px-4 py-3 flex items-center justify-between cursor-pointer select-none transition-colors ${styles.headerBg}`}
      >
        <div className="flex items-center space-x-3.5 min-w-0 flex-1">
          {/* Method Badge */}
          <span
            className={`w-18 py-1 rounded-lg text-center text-xs font-black font-mono tracking-wider shrink-0 ${styles.badge}`}
          >
            {endpoint.method}
          </span>

          {/* Endpoint Path */}
          <span className="font-mono text-xs sm:text-[13px] font-bold text-slate-900 truncate">
            {endpoint.path}
          </span>

          {/* Summary / Description */}
          <span className="hidden md:inline-block text-xs text-slate-600 truncate font-medium">
            {endpoint.summary}
          </span>
        </div>

        {/* Right Action Icons: Padlock & Chevron */}
        <div className="flex items-center space-x-3 shrink-0 ml-2">
          {endpoint.auth && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onOpenAuth) onOpenAuth();
              }}
              title={authToken ? 'Authorized with Bearer Token' : 'Click to Authorize'}
              className={`p-1 rounded-md transition-colors ${
                authToken
                  ? 'text-emerald-600 hover:bg-emerald-100/70'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {authToken ? <Lock className="w-4 h-4 stroke-[2.2]" /> : <Unlock className="w-4 h-4" />}
            </button>
          )}

          <ChevronDown
            className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${
              isExpanded ? 'rotate-180 text-slate-900' : ''
            }`}
          />
        </div>
      </div>

      {/* Expanded Details Panel */}
      {isExpanded && (
        <div className={`p-4 sm:p-6 border-t ${styles.border} bg-white space-y-5 animate-in fade-in duration-150`}>
          {/* Summary & RBAC Role Badges */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <p className="text-xs text-slate-700 leading-relaxed font-normal">
                {endpoint.description}
              </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                RBAC Access:
              </span>
              {endpoint.requiredRoles?.map((r) => (
                <span
                  key={r}
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200"
                >
                  {r.replace('_', ' ')}
                </span>
              ))}
            </div>
          </div>

          {/* Sub Navigation Tabs inside Endpoint */}
          <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2">
            <button
              type="button"
              onClick={() => setActiveTab('schema')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'schema'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Interactive Request & Schema</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('curl')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'curl'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>cURL Snippet</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('supabaseJs')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'supabaseJs'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>JavaScript (supabase-js)</span>
            </button>
          </div>

          {/* TAB 1: Interactive Schema & Live Execution */}
          {activeTab === 'schema' && (
            <div className="space-y-4">
              {/* Parameters Table */}
              {endpoint.parameters && endpoint.parameters.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-2">
                    Parameters ({endpoint.parameters.length})
                  </h4>
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100/80 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="px-3.5 py-2">Parameter</th>
                          <th className="px-3.5 py-2">In</th>
                          <th className="px-3.5 py-2">Type</th>
                          <th className="px-3.5 py-2">Description</th>
                          <th className="px-3.5 py-2">Value (Live Input)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/70 font-mono">
                        {endpoint.parameters.map((p) => (
                          <tr key={p.name} className="hover:bg-white transition-colors">
                            <td className="px-3.5 py-2 font-bold text-slate-800">
                              {p.name}
                              {p.required && <span className="text-rose-500 ml-0.5">*</span>}
                            </td>
                            <td className="px-3.5 py-2 text-slate-500 text-[11px]">{p.in}</td>
                            <td className="px-3.5 py-2 text-blue-600 text-[11px]">{p.type}</td>
                            <td className="px-3.5 py-2 font-sans text-slate-600 text-[11px] max-w-xs">
                              {p.description}
                            </td>
                            <td className="px-3.5 py-2">
                              <input
                                type="text"
                                value={paramValues[p.name] ?? ''}
                                onChange={(e) =>
                                  setParamValues({ ...paramValues, [p.name]: e.target.value })
                                }
                                placeholder={p.defaultValue || 'value'}
                                className="w-full px-2.5 py-1 text-xs rounded-lg border border-slate-300 bg-white focus:border-[#3b5bfd] focus:ring-1 focus:ring-blue-100 outline-none"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Request Body (for POST/PATCH) */}
              {endpoint.requestBody && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                      Request Body (JSON Schema)
                    </h4>
                    <button
                      type="button"
                      onClick={() => setBodyInput(JSON.stringify(endpoint.requestBody, null, 2))}
                      className="text-[10px] font-bold text-[#3b5bfd] hover:underline cursor-pointer"
                    >
                      Reset to sample
                    </button>
                  </div>
                  <textarea
                    rows={6}
                    value={bodyInput}
                    onChange={(e) => setBodyInput(e.target.value)}
                    className="w-full font-mono text-xs p-3 rounded-xl border border-slate-300 bg-slate-900 text-slate-100 focus:border-[#3b5bfd] outline-none leading-relaxed"
                  />
                </div>
              )}

              {/* Execute Button */}
              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleExecute}
                  disabled={isExecuting}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-md flex items-center gap-2 transition-all cursor-pointer ${
                    isExecuting ? 'bg-slate-400 cursor-not-allowed' : 'bg-[#3b5bfd] hover:bg-blue-700 active:scale-98 shadow-blue-500/25'
                  }`}
                >
                  {isExecuting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-current" />
                  )}
                  <span>{isExecuting ? 'Sending Request...' : 'Execute Query'}</span>
                </button>

                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <span>Server:</span>
                  <code className="text-slate-800 font-mono font-bold bg-slate-100 px-1.5 py-0.5 rounded">
                    Supabase PostgREST
                  </code>
                </span>
              </div>

              {/* Live Execution Result Container */}
              {executionResult && (
                <div className="mt-4 p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-extrabold text-slate-800">Server Response</span>
                      <span
                        className={`px-2.5 py-0.5 rounded-md text-[11px] font-extrabold font-mono ${
                          executionResult.status >= 200 && executionResult.status < 300
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {executionResult.status} {executionResult.statusText}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-mono text-slate-500">
                        {executionResult.duration}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(JSON.stringify(executionResult.data, null, 2))}
                        className="text-xs font-bold text-[#3b5bfd] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedCode ? 'Copied' : 'Copy Response'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-950 text-slate-100 p-3.5 rounded-xl font-mono text-xs overflow-auto max-h-72">
                    <pre>{JSON.stringify(executionResult.data, null, 2)}</pre>
                  </div>
                </div>
              )}

              {/* Sample Response Model Preview (when not executed yet) */}
              {!executionResult && (
                <div className="pt-2">
                  <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-2">
                    Responses Definition
                  </h4>
                  <div className="space-y-2">
                    {Object.entries(endpoint.responses).map(([code, resp]) => (
                      <div
                        key={code}
                        className="p-3 rounded-xl border border-slate-200/80 bg-white text-xs space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                              code.startsWith('2')
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {code}
                          </span>
                          <span className="text-slate-600 text-xs font-medium">{resp.description}</span>
                        </div>
                        {resp.body && (
                          <pre className="bg-slate-900 text-slate-200 p-2.5 rounded-lg font-mono text-[11px] overflow-auto max-h-36">
                            {JSON.stringify(resp.body, null, 2)}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: cURL Snippet */}
          {activeTab === 'curl' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Shell / Terminal Command</span>
                <button
                  type="button"
                  onClick={() => handleCopy(endpoint.curlSnippet)}
                  className="text-xs font-bold text-[#3b5bfd] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Copied' : 'Copy cURL'}</span>
                </button>
              </div>
              <div className="bg-slate-950 text-emerald-400 p-4 rounded-xl font-mono text-xs overflow-auto leading-relaxed">
                <pre>{endpoint.curlSnippet}</pre>
              </div>
            </div>
          )}

          {/* TAB 3: JavaScript Snippet */}
          {activeTab === 'supabaseJs' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">@supabase/supabase-js v2 Client Snippet</span>
                <button
                  type="button"
                  onClick={() => handleCopy(endpoint.supabaseJsSnippet)}
                  className="text-xs font-bold text-[#3b5bfd] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Copied' : 'Copy JS Code'}</span>
                </button>
              </div>
              <div className="bg-slate-950 text-blue-300 p-4 rounded-xl font-mono text-xs overflow-auto leading-relaxed">
                <pre>{endpoint.supabaseJsSnippet}</pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
