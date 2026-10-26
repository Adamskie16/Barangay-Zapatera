// Admin/src/features/docs/ApiDocsView.jsx
import React, { useState, useEffect } from 'react';
import {
  Lock,
  Unlock,
  ChevronDown,
  ShieldCheck,
} from 'lucide-react';
import { API_METADATA, TAG_GROUPS, ENDPOINTS } from './apiData';
import EndpointCard from './EndpointCard';
import AuthorizeModal from './AuthorizeModal';
import OpenApiJsonModal from './OpenApiJsonModal';
import { supabase, supabaseUrl, supabaseAnonKey } from '../../core/supabase';

export default function ApiDocsView() {
  // Authorize state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isOpenApiModalOpen, setIsOpenApiModalOpen] = useState(false);
  const [authToken, setAuthToken] = useState('');
  const [apiKey, setApiKey] = useState(supabaseAnonKey || '');

  // Attempt auto-fill of active user JWT token on load
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session?.access_token) {
        setAuthToken(data.session.access_token);
      }
    });
  }, []);

  // Expanded sections & endpoint rows
  const [expandedGroups, setExpandedGroups] = useState(() => {
    const init = {};
    TAG_GROUPS.forEach((tg) => {
      init[tg.id] = true; // default all open like Swagger UI
    });
    return init;
  });

  const [expandedEndpoints, setExpandedEndpoints] = useState({});

  const toggleGroup = (groupId) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const handleExpandAll = () => {
    const allGroups = {};
    const allEndpoints = {};
    TAG_GROUPS.forEach((tg) => {
      allGroups[tg.id] = true;
    });
    ENDPOINTS.forEach((ep) => {
      allEndpoints[ep.id] = true;
    });
    setExpandedGroups(allGroups);
    setExpandedEndpoints(allEndpoints);
  };

  const handleCollapseAll = () => {
    const closedGroups = {};
    TAG_GROUPS.forEach((tg) => {
      closedGroups[tg.id] = false;
    });
    setExpandedGroups(closedGroups);
    setExpandedEndpoints({});
  };

  const toggleEndpoint = (epId) => {
    setExpandedEndpoints((prev) => ({
      ...prev,
      [epId]: !prev[epId],
    }));
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Swagger UI Header Section */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-2">
            {/* Title & OAS Badge */}
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight font-sans">
                {API_METADATA.title}
              </h1>
              <span className="px-2 py-0.5 rounded-md bg-[#49cc90] text-white text-[11px] font-bold font-mono shadow-2xs">
                {API_METADATA.specType}
              </span>
            </div>

            {/* /openapi.json link */}
            <div>
              <button
                type="button"
                onClick={() => setIsOpenApiModalOpen(true)}
                className="text-xs font-mono text-slate-500 hover:text-blue-600 hover:underline transition-colors cursor-pointer"
              >
                {API_METADATA.specPath}
              </button>
            </div>
          </div>

          {/* Authorize Button (Swagger UI Green Border Style) */}
          <div className="flex flex-col items-start sm:items-end gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className={`px-4 py-1.5 rounded-md text-xs font-bold border-2 transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                authToken
                  ? 'border-[#49cc90] text-[#49cc90] bg-emerald-50/50'
                  : 'border-[#49cc90] text-[#49cc90] hover:bg-emerald-50/40'
              }`}
            >
              <span>Authorize</span>
              {authToken ? (
                <Lock className="w-3.5 h-3.5 stroke-[2.4]" />
              ) : (
                <Unlock className="w-3.5 h-3.5 stroke-[2]" />
              )}
            </button>

            {authToken && (
              <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Authorized (Bearer JWT)</span>
              </span>
            )}
          </div>
        </div>

        {/* Description Paragraph */}
        <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed max-w-4xl pt-1">
          REST API of <strong className="text-slate-800">Barangay Zapatera E-Governance &amp; Document Management System</strong>. Click{' '}
          <button
            type="button"
            onClick={() => setIsAuthModalOpen(true)}
            className="text-[#49cc90] font-bold underline hover:text-emerald-700 cursor-pointer"
          >
            Authorize
          </button>{' '}
          and paste the <code className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-mono text-[11px] font-semibold">token</code> from a login response to try the protected endpoints across <strong className="text-slate-800">Admin</strong>, <strong className="text-slate-800">Super Admin</strong>, <strong className="text-slate-800">Resident</strong>, and <strong className="text-slate-800">Treasurer</strong> roles.
        </p>
      </div>

      {/* Expand all | Collapse all (Swagger UI style, right-aligned) */}
      <div className="flex items-center justify-end space-x-2 text-xs font-bold text-slate-500 pt-2 border-b border-slate-200/80 pb-2.5">
        <button
          type="button"
          onClick={handleExpandAll}
          className="hover:text-blue-600 transition-colors cursor-pointer"
        >
          Expand all
        </button>
        <span>|</span>
        <button
          type="button"
          onClick={handleCollapseAll}
          className="hover:text-blue-600 transition-colors cursor-pointer"
        >
          Collapse all
        </button>
      </div>

      {/* Accordion Tag Groups with normal APIs */}
      <div className="space-y-6 pt-1">
        {TAG_GROUPS.map((group) => {
          const groupEndpoints = ENDPOINTS.filter(
            (ep) => ep.tag === group.id || (group.id !== 'shared-and-public' && ep.role === group.id)
          );

          if (groupEndpoints.length === 0) return null;

          const isGroupOpen = expandedGroups[group.id] ?? true;

          return (
            <div key={group.id} className="space-y-2.5">
              {/* Group Header Banner (matching reference image) */}
              <div
                onClick={() => toggleGroup(group.id)}
                className="flex items-center justify-between pb-2 border-b border-slate-200/90 cursor-pointer select-none group"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 font-sans tracking-tight group-hover:text-blue-600 transition-colors">
                    {group.name}
                  </h2>
                  <span className="text-xs text-slate-500 font-normal">
                    {group.description}
                  </span>
                </div>

                <div className="flex items-center space-x-3 shrink-0 ml-2">
                  <span className="text-xs font-mono font-medium text-slate-500">
                    {groupEndpoints.length} operations
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${
                      isGroupOpen ? 'rotate-0' : '-rotate-90'
                    }`}
                  />
                </div>
              </div>

              {/* Group Endpoint Rows */}
              {isGroupOpen && (
                <div className="space-y-2">
                  {groupEndpoints.map((ep) => (
                    <EndpointCard
                      key={ep.id}
                      endpoint={ep}
                      isExpanded={Boolean(expandedEndpoints[ep.id])}
                      onToggle={() => toggleEndpoint(ep.id)}
                      onOpenAuth={() => setIsAuthModalOpen(true)}
                      authToken={authToken}
                      apiKey={apiKey}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modals */}
      <AuthorizeModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        authToken={authToken}
        setAuthToken={setAuthToken}
        apiKey={apiKey}
        setApiKey={setApiKey}
      />

      <OpenApiJsonModal
        isOpen={isOpenApiModalOpen}
        onClose={() => setIsOpenApiModalOpen(false)}
      />
    </div>
  );
}
