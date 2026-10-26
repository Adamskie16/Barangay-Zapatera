// Admin/src/features/docs/apiData.js
// Complete OpenAPI 3.1 & Supabase REST/PostgREST, Auth, RPC, Storage, and Edge Functions Specification
// for Barangay Zapatera E-Governance and Document Management System.

export const API_METADATA = {
  title: 'Barangay Zapatera E-Governance API',
  version: '3.1.0',
  specType: 'OAS 3.1',
  specPath: '/openapi.json',
  description:
    'REST & Realtime API of Barangay Zapatera E-Governance & Document Management System (Cebu City, Philippines). Built on Supabase PostgREST v12, GoTrue Auth, Realtime Engine, Storage API, and Deno Edge Functions. Click Authorize to test protected endpoints with your JWT token or anon key across Admin, Super Admin, Resident, and Treasurer roles.',
  baseUrl: 'https://qzmxwxmtuzoanwevftnd.supabase.co',
  contact: {
    name: 'Barangay Zapatera ICT & Development Directorate',
    email: 'zapatera.lnb24@gmail.com',
    url: 'https://barangayzapatera.gov.ph',
  },
  license: {
    name: 'Republic Act 10173 (Data Privacy Act of 2012) Compliant',
    url: 'https://www.privacy.gov.ph',
  },
};

export const TAG_GROUPS = [
  {
    id: 'admin',
    name: 'admin',
    roleLabel: 'Admin (Staff)',
    description: 'Administrative staff operations: request evaluation, certificate generation, guidelines, lockout unlock, and operational auditing.',
    color: '#3b5bfd',
  },
  {
    id: 'super_admin',
    name: 'super_admin',
    roleLabel: 'Super Admin (Executive)',
    description: 'Master governance operations: system configuration, barangay officials directory, global user provisioning, permanent archive purge, and immutable audit trails.',
    color: '#7c3aed',
  },
  {
    id: 'resident',
    name: 'resident',
    roleLabel: 'Resident (Citizen)',
    description: 'Citizen portal services: authentication, document filing with attachments, real-time lifecycle tracking, public bulletins, and notifications.',
    color: '#10b981',
  },
  {
    id: 'treasurer',
    name: 'treasurer',
    roleLabel: 'Treasurer (Finance)',
    description: 'Financial collection & revenue governance: document fee auditing, Official Receipt (OR) issuance, cash/GCash logging, statutory waivers, and municipal ledger reports.',
    color: '#f59e0b',
  },
  {
    id: 'shared-and-public',
    name: 'shared-and-public',
    roleLabel: 'Shared & Public',
    description: 'Public catalog of certificates, community calendar events, public advisories, and guest tracking lookups.',
    color: '#0284c7',
  },
  {
    id: 'edge-functions-and-storage',
    name: 'edge-functions-and-storage',
    roleLabel: 'Edge Functions & Storage',
    description: 'Transactional email dispatch (Deno Edge Function), secure multi-part ID/cedula file uploads, and Supabase Realtime WebSocket subscriptions.',
    color: '#6366f1',
  },
];

export const ENDPOINTS = [
  // =========================================================================
  // ADMIN ROUTES
  // =========================================================================
  {
    id: 'admin-get-requests',
    role: 'admin',
    tag: 'admin',
    method: 'GET',
    path: '/rest/v1/document_requests',
    summary: 'Query document application queue for administrative review',
    description:
      'Fetches active document applications submitted by residents. Allows staff to filter by pending, under_review, approved, or declined status, and exclude soft-deleted/archived requests.',
    auth: true,
    requiredRoles: ['admin', 'super_admin'],
    parameters: [
      { name: 'select', in: 'query', type: 'string', required: false, defaultValue: '*,resident:profiles(*),document_type:document_types(*)', description: 'Foreign key expansion for resident profiles and document guidelines.' },
      { name: 'status', in: 'query', type: 'string', required: false, defaultValue: 'eq.pending', description: 'PostgREST filter by processing status (eq.pending, eq.under_review, eq.approved, eq.declined).' },
      { name: 'is_archived', in: 'query', type: 'string', required: false, defaultValue: 'eq.false', description: 'Filter out soft-deleted records.' },
      { name: 'order', in: 'query', type: 'string', required: false, defaultValue: 'created_at.desc', description: 'Order records chronologically.' },
    ],
    responses: {
      200: {
        description: 'Successfully retrieved document request queue array',
        body: [
          {
            id: '7b80a133-e9ef-4bf2-bca4-d83296c00cb5',
            tracking_number: 'BZ-2026-4821',
            resident_id: '8ef93021-99cd-4a30-80a5-f12b7da13e11',
            document_type_id: 'c4e2b090-34ef-479c-9821-4b108849bca0',
            purpose: 'Employment Local Application',
            status: 'pending',
            pickup_date: null,
            pickup_time_slot: null,
            notes: null,
            uploaded_files: [{ name: 'Valid_ID.pdf', url: 'https://.../documents/valid_id.pdf' }],
            is_claimed: false,
            is_archived: false,
            created_at: '2026-10-26T08:30:00Z',
          },
        ],
      },
      401: { description: 'Missing or expired Bearer JWT authentication header' },
      403: { description: 'Access denied: Profile role does not have admin permissions under RLS' },
    },
    curlSnippet: `curl -X GET "https://qzmxwxmtuzoanwevftnd.supabase.co/rest/v1/document_requests?select=*,resident:profiles(*),document_type:document_types(*)&status=eq.pending&is_archived=eq.false&order=created_at.desc" \\
  -H "apikey: <SUPABASE_ANON_KEY>" \\
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>"`,
    supabaseJsSnippet: `const { data, error } = await supabase
  .from('document_requests')
  .select('*, resident:profiles(*), document_type:document_types(*)')
  .eq('status', 'pending')
  .eq('is_archived', false)
  .order('created_at', { ascending: false });`,
  },
  {
    id: 'admin-evaluate-request',
    role: 'admin',
    tag: 'admin',
    method: 'PATCH',
    path: '/rest/v1/document_requests?id=eq.{id}',
    summary: 'Evaluate application: approve, request resubmission, or decline',
    description:
      'Performs state transitions for an application. Admin can approve with estimated pickup schedule, request resubmission due to invalid or unreadable IDs, or decline with mandatory reason.',
    auth: true,
    requiredRoles: ['admin', 'super_admin'],
    parameters: [
      { name: 'id', in: 'query', type: 'string', required: true, defaultValue: '7b80a133-e9ef-4bf2-bca4-d83296c00cb5', description: 'UUID of the document request to update.' },
    ],
    requestBody: {
      status: 'approved',
      pickup_date: '2026-10-28',
      pickup_time_slot: '09:00 AM - 11:30 AM',
      notes: 'Please bring original Valid Government ID and CEDULA on pickup date.',
      processed_by: '8ef93021-99cd-4a30-80a5-f12b7da13e11',
      approved_at: '2026-10-26T09:15:00Z',
    },
    responses: {
      200: {
        description: 'Document request successfully updated',
        body: [{ id: '7b80a133-e9ef-4bf2-bca4-d83296c00cb5', status: 'approved', pickup_date: '2026-10-28', updated_at: '2026-10-26T09:15:00Z' }],
      },
      400: { description: 'Invalid payload structure or invalid status enum value' },
      401: { description: 'Unauthorized: Invalid JWT' },
    },
    curlSnippet: `curl -X PATCH "https://qzmxwxmtuzoanwevftnd.supabase.co/rest/v1/document_requests?id=eq.7b80a133-e9ef-4bf2-bca4-d83296c00cb5" \\
  -H "apikey: <SUPABASE_ANON_KEY>" \\
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>" \\
  -H "Content-Type: application/json" \\
  -H "Prefer: return=representation" \\
  -d '{
    "status": "approved",
    "pickup_date": "2026-10-28",
    "pickup_time_slot": "09:00 AM - 11:30 AM",
    "notes": "Bring original CEDULA.",
    "approved_at": "2026-10-26T09:15:00Z"
  }'`,
    supabaseJsSnippet: `const { data, error } = await supabase
  .from('document_requests')
  .update({
    status: 'approved',
    pickup_date: '2026-10-28',
    pickup_time_slot: '09:00 AM - 11:30 AM',
    notes: 'Bring original CEDULA.',
    approved_at: new Date().toISOString(),
  })
  .eq('id', '7b80a133-e9ef-4bf2-bca4-d83296c00cb5')
  .select();`,
  },
  {
    id: 'admin-mark-claimed',
    role: 'admin',
    tag: 'admin',
    method: 'PATCH',
    path: '/rest/v1/document_requests?tracking_number=eq.{tracking_number}',
    summary: 'Mark certificate as Claimed upon resident physical pickup',
    description:
      'Records handover of the physical stamped document at the Barangay Hall. Sets is_claimed=true, claimed_at timestamp, and claiming officer name for complete chain of custody.',
    auth: true,
    requiredRoles: ['admin', 'super_admin'],
    parameters: [
      { name: 'tracking_number', in: 'query', type: 'string', required: true, defaultValue: 'BZ-2026-4821', description: 'Barangay tracking number on the printed certificate.' },
    ],
    requestBody: {
      is_claimed: true,
      claimed_at: '2026-10-28T10:14:00Z',
      claimed_by_admin: 'Administrative Officer Dave Gomez',
      status: 'issued',
    },
    responses: {
      200: {
        description: 'Certificate marked claimed and released',
        body: [{ tracking_number: 'BZ-2026-4821', is_claimed: true, status: 'issued', claimed_at: '2026-10-28T10:14:00Z' }],
      },
    },
    curlSnippet: `curl -X PATCH "https://qzmxwxmtuzoanwevftnd.supabase.co/rest/v1/document_requests?tracking_number=eq.BZ-2026-4821" \\
  -H "apikey: <SUPABASE_ANON_KEY>" \\
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>" \\
  -H "Content-Type: application/json" \\
  -H "Prefer: return=representation" \\
  -d '{"is_claimed": true, "claimed_at": "2026-10-28T10:14:00Z", "claimed_by_admin": "Admin Desk"}'`,
    supabaseJsSnippet: `const { data, error } = await supabase
  .from('document_requests')
  .update({
    is_claimed: true,
    claimed_at: new Date().toISOString(),
    claimed_by_admin: currentUser.full_name,
    status: 'issued',
  })
  .eq('tracking_number', 'BZ-2026-4821');`,
  },
  {
    id: 'admin-unlock-resident',
    role: 'admin',
    tag: 'admin',
    method: 'PATCH',
    path: '/rest/v1/profiles?id=eq.{id}',
    summary: 'Execute administrative resident account lockout unlock',
    description:
      'Assists residents locked out after 3 failed password attempts. Resets failed counters to 0, sets is_locked=false, restores is_active=true, and logs the unlock officer.',
    auth: true,
    requiredRoles: ['admin', 'super_admin', 'accountmanagement'],
    parameters: [
      { name: 'id', in: 'query', type: 'string', required: true, defaultValue: '8ef93021-99cd-4a30-80a5-f12b7da13e11', description: 'Resident profile UUID.' },
    ],
    requestBody: {
      is_locked: false,
      failed_attempts: 0,
      failed_login_attempts: 0,
      locked_at: null,
      unlocked_at: '2026-10-26T14:00:00Z',
      is_active: true,
    },
    responses: {
      200: {
        description: 'Resident account unlocked successfully',
        body: [{ id: '8ef93021-99cd-4a30-80a5-f12b7da13e11', is_locked: false, failed_attempts: 0, is_active: true }],
      },
    },
    curlSnippet: `curl -X PATCH "https://qzmxwxmtuzoanwevftnd.supabase.co/rest/v1/profiles?id=eq.8ef93021-99cd-4a30-80a5-f12b7da13e11" \\
  -H "apikey: <SUPABASE_ANON_KEY>" \\
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>" \\
  -H "Content-Type: application/json" \\
  -H "Prefer: return=representation" \\
  -d '{
    "is_locked": false,
    "failed_attempts": 0,
    "failed_login_attempts": 0,
    "locked_at": null,
    "is_active": true
  }'`,
    supabaseJsSnippet: `const { data, error } = await supabase
  .from('profiles')
  .update({
    is_locked: false,
    failed_attempts: 0,
    failed_login_attempts: 0,
    locked_at: null,
    unlocked_at: new Date().toISOString(),
    is_active: true,
  })
  .eq('id', residentId);`,
  },
  {
    id: 'admin-publish-news',
    role: 'admin',
    tag: 'admin',
    method: 'POST',
    path: '/rest/v1/news',
    summary: 'Publish official public bulletin, disaster advisory, or announcement',
    description:
      'Broadcasts announcements to the Resident mobile app and web portal. Staff can flag emergency alerts or pin critical advisories to the top of citizen feeds.',
    auth: true,
    requiredRoles: ['admin', 'super_admin'],
    requestBody: {
      title: 'Free Rabies Vaccination & Pet Microchipping Drive',
      category: 'Public Advisory',
      description: 'Annual veterinary health initiative for domestic pets in Barangay Zapatera.',
      content: 'The Barangay Zapatera Council in partnership with Cebu City Veterinary Office will conduct free anti-rabies vaccination at Zapatera Sports Complex this coming Saturday.',
      location: 'Zapatera Sports Complex, Cebu City',
      banner_url: 'https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=800',
      is_important: true,
      is_emergency: false,
      is_published: true,
      target_audience: 'residents',
    },
    responses: {
      201: {
        description: 'Public bulletin published and broadcast to resident feeds',
        body: [{ id: '9a31bc08-b021-4d3e-9081-33da67119e2a', title: 'Free Rabies Vaccination', is_published: true }],
      },
    },
    curlSnippet: `curl -X POST "https://qzmxwxmtuzoanwevftnd.supabase.co/rest/v1/news" \\
  -H "apikey: <SUPABASE_ANON_KEY>" \\
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>" \\
  -H "Content-Type: application/json" \\
  -H "Prefer: return=representation" \\
  -d '{
    "title": "Free Rabies Vaccination Drive",
    "category": "Public Advisory",
    "description": "Annual veterinary health initiative",
    "content": "Veterinary team arriving Saturday 8am.",
    "is_published": true
  }'`,
    supabaseJsSnippet: `const { data, error } = await supabase
  .from('news')
  .insert([bulletinPayload])
  .select();`,
  },
  {
    id: 'admin-get-audit-logs',
    role: 'admin',
    tag: 'admin',
    method: 'GET',
    path: '/rest/v1/activity_logs',
    summary: 'Query staff operational activity logs & security audit trail',
    description:
      'Inspects chronological logs of actions executed by staff members, including request evaluations, printable certificate exports, and resident unlock operations.',
    auth: true,
    requiredRoles: ['admin', 'super_admin'],
    parameters: [
      { name: 'select', in: 'query', type: 'string', required: false, defaultValue: '*', description: 'Fields to select.' },
      { name: 'order', in: 'query', type: 'string', required: false, defaultValue: 'created_at.desc', description: 'Order by newest log entry.' },
      { name: 'limit', in: 'query', type: 'integer', required: false, defaultValue: '50', description: 'Pagination limit.' },
    ],
    responses: {
      200: {
        description: 'Array of audit log entries',
        body: [
          {
            id: 'd9183021-ec01-449e-b811-09ba18c39b11',
            user_email: 'admin@zapatera.gov.ph',
            action: 'APPROVE_REQUEST',
            feature: 'Document Requests',
            details: 'Approved Barangay Clearance for tracking BZ-2026-4821 with pickup 2026-10-28',
            level: 'info',
            ip_address: '124.106.12.8',
            created_at: '2026-10-26T09:15:02Z',
          },
        ],
      },
    },
    curlSnippet: `curl -X GET "https://qzmxwxmtuzoanwevftnd.supabase.co/rest/v1/activity_logs?order=created_at.desc&limit=50" \\
  -H "apikey: <SUPABASE_ANON_KEY>" \\
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>"`,
    supabaseJsSnippet: `const { data, error } = await supabase
  .from('activity_logs')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(50);`,
  },

  // =========================================================================
  // SUPER ADMIN ROUTES
  // =========================================================================
  {
    id: 'super-admin-get-config',
    role: 'super_admin',
    tag: 'super_admin',
    method: 'GET',
    path: '/rest/v1/system_config?id=eq.1',
    summary: 'Fetch singleton institutional barangay configuration & signatories',
    description:
      'Retrieves official Barangay institutional identity data: Punong Barangay name, official seal URLs, letterhead watermarks, council directory, and statutory document prefixes.',
    auth: true,
    requiredRoles: ['super_admin', 'admin'],
    parameters: [
      { name: 'id', in: 'query', type: 'integer', required: true, defaultValue: '1', description: 'Singleton configuration record row ID (always 1).' },
    ],
    responses: {
      200: {
        description: 'Barangay institutional branding & signatory dataset',
        body: {
          id: 1,
          barangay_name: 'Barangay Zapatera',
          municipality: 'Cebu City',
          province: 'Cebu',
          punong_barangay: 'HON. DAVID M. AGRAVANTE',
          signatory_title: 'Punong Barangay',
          seal_url: 'https://.../seals/zapatera_seal.png',
          contact_email: 'zapatera.lnb24@gmail.com',
          contact_phone: '(032)503-6465',
          doc_prefix: 'BZ-2026',
        },
      },
    },
    curlSnippet: `curl -X GET "https://qzmxwxmtuzoanwevftnd.supabase.co/rest/v1/system_config?id=eq.1" \\
  -H "apikey: <SUPABASE_ANON_KEY>" \\
  -H "Authorization: Bearer <SUPERADMIN_JWT_TOKEN>"`,
    supabaseJsSnippet: `const { data, error } = await supabase
  .from('system_config')
  .select('*')
  .eq('id', 1)
  .single();`,
  },
  {
    id: 'super-admin-update-config',
    role: 'super_admin',
    tag: 'super_admin',
    method: 'PATCH',
    path: '/rest/v1/system_config?id=eq.1',
    summary: 'Master update of Barangay signatories, official council directory & seals',
    description:
      'Exclusive to Super Administrator. Updates the Punong Barangay name, councilors directory, municipal seals, and office hours that dynamically populate digital certificates.',
    auth: true,
    requiredRoles: ['super_admin'],
    requestBody: {
      punong_barangay: 'HON. DAVID M. AGRAVANTE',
      signatory_title: 'Punong Barangay',
      contact_phone: '(032) 503-6465',
      contact_email: 'zapatera.lnb24@gmail.com',
      office_hours: 'Mon - Fri: 8:00 AM - 5:00 PM',
      updated_at: '2026-10-26T15:00:00Z',
    },
    responses: {
      200: {
        description: 'Institutional configurations updated successfully',
        body: [{ id: 1, punong_barangay: 'HON. DAVID M. AGRAVANTE', updated_at: '2026-10-26T15:00:00Z' }],
      },
      403: { description: 'SuperAdmin permission required under RLS policy Config SuperAdmin Manage' },
    },
    curlSnippet: `curl -X PATCH "https://qzmxwxmtuzoanwevftnd.supabase.co/rest/v1/system_config?id=eq.1" \\
  -H "apikey: <SUPABASE_ANON_KEY>" \\
  -H "Authorization: Bearer <SUPERADMIN_JWT_TOKEN>" \\
  -H "Content-Type: application/json" \\
  -H "Prefer: return=representation" \\
  -d '{
    "punong_barangay": "HON. DAVID M. AGRAVANTE",
    "contact_phone": "(032) 503-6465"
  }'`,
    supabaseJsSnippet: `const { data, error } = await supabase
  .from('system_config')
  .update({
    punong_barangay: 'HON. DAVID M. AGRAVANTE',
    contact_phone: '(032) 503-6465',
    updated_at: new Date().toISOString(),
  })
  .eq('id', 1)
  .select();`,
  },
  {
    id: 'super-admin-purge-archive',
    role: 'super_admin',
    tag: 'super_admin',
    method: 'DELETE',
    path: '/rest/v1/document_requests?id=eq.{id}&is_archived=eq.true',
    summary: 'Execute permanent database purge of archived document records',
    description:
      'Performs irreversible database destruction of obsolete or fraudulent archived records. Strictly restricted to Super Administrator with non-repudiation audit logging.',
    auth: true,
    requiredRoles: ['super_admin'],
    parameters: [
      { name: 'id', in: 'query', type: 'string', required: true, defaultValue: '7b80a133-e9ef-4bf2-bca4-d83296c00cb5', description: 'UUID of the archived request.' },
      { name: 'is_archived', in: 'query', type: 'string', required: true, defaultValue: 'eq.true', description: 'Safety guard: only archived records can be purged.' },
    ],
    responses: {
      204: { description: 'Archived record permanently purged from database' },
      403: { description: 'Permanent deletion restricted to Super Administrator' },
    },
    curlSnippet: `curl -X DELETE "https://qzmxwxmtuzoanwevftnd.supabase.co/rest/v1/document_requests?id=eq.7b80a133-e9ef-4bf2-bca4-d83296c00cb5&is_archived=eq.true" \\
  -H "apikey: <SUPABASE_ANON_KEY>" \\
  -H "Authorization: Bearer <SUPERADMIN_JWT_TOKEN>"`,
    supabaseJsSnippet: `const { error } = await supabase
  .from('document_requests')
  .delete()
  .eq('id', targetId)
  .eq('is_archived', true);`,
  },
  {
    id: 'super-admin-user-provision',
    role: 'super_admin',
    tag: 'super_admin',
    method: 'POST',
    path: '/rest/v1/profiles',
    summary: 'Provision official staff, treasurer, or administrative personnel account',
    description:
      'Creates authorized staff credentials with predetermined RBAC roles (admin, treasurer, accountmanagement, super_admin). Enforces institutional email validation and password security.',
    auth: true,
    requiredRoles: ['super_admin', 'accountmanagement'],
    requestBody: {
      email: 'treasurer.zapatera@gmail.com',
      full_name: 'Ma. Elena Santos',
      username: 'treasurer_santos',
      role: 'treasurer',
      office: 'Office of the Barangay Treasurer',
      position: 'Barangay Treasurer',
      phone: '09171234567',
      is_active: true,
      is_locked: false,
    },
    responses: {
      201: {
        description: 'New personnel profile provisioned successfully',
        body: [{ id: '4a19b821-22fe-4dae-8812-78ba90123e44', email: 'treasurer.zapatera@gmail.com', role: 'treasurer' }],
      },
    },
    curlSnippet: `curl -X POST "https://qzmxwxmtuzoanwevftnd.supabase.co/rest/v1/profiles" \\
  -H "apikey: <SUPABASE_ANON_KEY>" \\
  -H "Authorization: Bearer <SUPERADMIN_JWT_TOKEN>" \\
  -H "Content-Type: application/json" \\
  -H "Prefer: return=representation" \\
  -d '{
    "email": "treasurer.zapatera@gmail.com",
    "full_name": "Ma. Elena Santos",
    "role": "treasurer",
    "is_active": true
  }'`,
    supabaseJsSnippet: `const { data, error } = await supabase
  .from('profiles')
  .insert([userPayload])
  .select();`,
  },

  // =========================================================================
  // RESIDENT ROUTES
  // =========================================================================
  {
    id: 'resident-auth-signup',
    role: 'resident',
    tag: 'resident',
    method: 'POST',
    path: '/auth/v1/signup',
    summary: 'Resident citizen identity registration & account creation',
    description:
      'Enables residents of Barangay Zapatera to register their authenticated digital citizen account with full demographics, sitio location, and residency length.',
    auth: false,
    requiredRoles: ['resident', 'public'],
    requestBody: {
      email: 'juan.delacruz@gmail.com',
      password: 'SamplePassword123!',
      data: {
        full_name: 'Juan Dela Cruz',
        first_name: 'Juan',
        last_name: 'Dela Cruz',
        birth_date: '1998-05-12',
        civil_status: 'Single',
        gender: 'Male',
        sitio: 'Sitio Riverside',
        years_in_barangay: 8,
        voter_status: 'Registered Voter',
        role: 'resident',
      },
    },
    responses: {
      200: {
        description: 'Citizen user registered and auth session token returned',
        body: {
          access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          token_type: 'bearer',
          user: { id: '98fa1011-23bc-499e-8812-10ba98cd3e41', email: 'juan.delacruz@gmail.com', role: 'authenticated' },
        },
      },
      400: { description: 'Email already registered or password does not meet complexity standards' },
    },
    curlSnippet: `curl -X POST "https://qzmxwxmtuzoanwevftnd.supabase.co/auth/v1/signup" \\
  -H "apikey: <SUPABASE_ANON_KEY>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "juan.delacruz@gmail.com",
    "password": "SamplePassword123!",
    "data": { "full_name": "Juan Dela Cruz", "role": "resident" }
  }'`,
    supabaseJsSnippet: `const { data, error } = await supabase.auth.signUp({
  email: 'juan.delacruz@gmail.com',
  password: 'SamplePassword123!',
  options: {
    data: { full_name: 'Juan Dela Cruz', role: 'resident' }
  }
});`,
  },
  {
    id: 'resident-submit-request',
    role: 'resident',
    tag: 'resident',
    method: 'POST',
    path: '/rest/v1/document_requests',
    summary: 'Submit online document certification application with attachments',
    description:
      'Submits a formal request for Barangay Clearance, Certificate of Indigency, Certificate of Residency, Business Clearance, or Barangay ID with purpose and uploaded IDs.',
    auth: true,
    requiredRoles: ['resident'],
    requestBody: {
      tracking_number: 'BZ-2026-8912',
      resident_id: '98fa1011-23bc-499e-8812-10ba98cd3e41',
      document_type_id: 'c4e2b090-34ef-479c-9821-4b108849bca0',
      purpose: 'Scholarship Application - Cebu City College',
      resident_birth_date: '1998-05-12',
      years_in_barangay: 8,
      status: 'pending',
      uploaded_files: [
        { name: 'Cedula_2026.jpg', url: 'https://.../documents/cedula_8912.jpg', size: 1048576 },
        { name: 'Voters_ID.pdf', url: 'https://.../documents/voter_8912.pdf', size: 2097152 },
      ],
      is_claimed: false,
      is_archived: false,
    },
    responses: {
      201: {
        description: 'Application successfully submitted with tracking number',
        body: [{ id: '550e8400-e29b-41d4-a716-446655440000', tracking_number: 'BZ-2026-8912', status: 'pending' }],
      },
    },
    curlSnippet: `curl -X POST "https://qzmxwxmtuzoanwevftnd.supabase.co/rest/v1/document_requests" \\
  -H "apikey: <SUPABASE_ANON_KEY>" \\
  -H "Authorization: Bearer <RESIDENT_JWT_TOKEN>" \\
  -H "Content-Type: application/json" \\
  -H "Prefer: return=representation" \\
  -d '{
    "tracking_number": "BZ-2026-8912",
    "resident_id": "98fa1011-23bc-499e-8812-10ba98cd3e41",
    "document_type_id": "c4e2b090-34ef-479c-9821-4b108849bca0",
    "purpose": "Scholarship Application",
    "status": "pending"
  }'`,
    supabaseJsSnippet: `const { data, error } = await supabase
  .from('document_requests')
  .insert([newApplication])
  .select();`,
  },
  {
    id: 'resident-track-request',
    role: 'resident',
    tag: 'resident',
    method: 'GET',
    path: '/rest/v1/document_requests?tracking_number=eq.{tracking_number}',
    summary: 'Track real-time certificate processing lifecycle by tracking number',
    description:
      'Public & citizen tracker lookup. Allows citizens to view the live processing status (pending -> under_review -> approved -> ready for pickup -> claimed) without waiting in line.',
    auth: false,
    requiredRoles: ['resident', 'public'],
    parameters: [
      { name: 'tracking_number', in: 'query', type: 'string', required: true, defaultValue: 'BZ-2026-8912', description: 'Official Barangay tracking number.' },
      { name: 'select', in: 'query', type: 'string', required: false, defaultValue: 'tracking_number,status,pickup_date,pickup_time_slot,notes,created_at,document_type:document_types(title,fee)', description: 'Safe public fields.' },
    ],
    responses: {
      200: {
        description: 'Live lifecycle stage of certificate request',
        body: [
          {
            tracking_number: 'BZ-2026-8912',
            status: 'approved',
            pickup_date: '2026-10-28',
            pickup_time_slot: '01:00 PM - 03:00 PM',
            notes: 'Ready for release at Release Counter 2.',
            document_type: { title: 'Certificate of Indigency', fee: 0.00 },
          },
        ],
      },
    },
    curlSnippet: `curl -X GET "https://qzmxwxmtuzoanwevftnd.supabase.co/rest/v1/document_requests?tracking_number=eq.BZ-2026-8912&select=tracking_number,status,pickup_date,pickup_time_slot,notes,document_type:document_types(title,fee)" \\
  -H "apikey: <SUPABASE_ANON_KEY>"`,
    supabaseJsSnippet: `const { data, error } = await supabase
  .from('document_requests')
  .select('tracking_number, status, pickup_date, pickup_time_slot, notes, document_type:document_types(title, fee)')
  .eq('tracking_number', 'BZ-2026-8912')
  .maybeSingle();`,
  },
  {
    id: 'resident-resubmit-request',
    role: 'resident',
    tag: 'resident',
    method: 'PATCH',
    path: '/rest/v1/document_requests?id=eq.{id}',
    summary: 'Resubmit flagged application with corrected attachment documents',
    description:
      'If an application is flagged by staff due to blurry or incomplete attachments, resident can upload corrected proofs and resubmit under the exact same tracking number.',
    auth: true,
    requiredRoles: ['resident'],
    requestBody: {
      status: 'pending',
      is_resubmitted: true,
      resubmitted_at: '2026-10-26T16:20:00Z',
      resubmission_count: 1,
      resubmission_notes: 'Re-uploaded clearer scanned copy of Cedula with readable tax number.',
      uploaded_files: [
        { name: 'Cedula_Clear_Copy.jpg', url: 'https://.../documents/cedula_clear.jpg' },
      ],
    },
    responses: {
      200: {
        description: 'Application resubmitted back into active review queue',
        body: [{ id: '550e8400-e29b-41d4-a716-446655440000', is_resubmitted: true, status: 'pending' }],
      },
    },
    curlSnippet: `curl -X PATCH "https://qzmxwxmtuzoanwevftnd.supabase.co/rest/v1/document_requests?id=eq.550e8400-e29b-41d4-a716-446655440000" \\
  -H "apikey: <SUPABASE_ANON_KEY>" \\
  -H "Authorization: Bearer <RESIDENT_JWT_TOKEN>" \\
  -H "Content-Type: application/json" \\
  -H "Prefer: return=representation" \\
  -d '{
    "status": "pending",
    "is_resubmitted": true,
    "resubmission_notes": "Updated ID copy."
  }'`,
    supabaseJsSnippet: `const { data, error } = await supabase
  .from('document_requests')
  .update({
    status: 'pending',
    is_resubmitted: true,
    resubmitted_at: new Date().toISOString(),
    resubmission_notes: notesText,
    uploaded_files: correctedFiles,
  })
  .eq('id', requestId);`,
  },

  // =========================================================================
  // TREASURER ROUTES
  // =========================================================================
  {
    id: 'treasurer-get-payments',
    role: 'treasurer',
    tag: 'treasurer',
    method: 'GET',
    path: '/rest/v1/document_requests',
    summary: 'Query document fees, payment statuses, and revenue ledger',
    description:
      'Treasurer financial desk query. Retrieves document transactions, assessed statutory fees, payment statuses (paid, unpaid, waived), and Official Receipt (OR) numbers.',
    auth: true,
    requiredRoles: ['treasurer', 'super_admin', 'admin'],
    parameters: [
      { name: 'select', in: 'query', type: 'string', required: false, defaultValue: 'id,tracking_number,purpose,fee,amount_paid,payment_status,is_paid,is_waived,waived_reason,or_number,payment_date,payment_method,resident:profiles(full_name,email),document_type:document_types(title,fee)', description: 'Financial ledger fields.' },
      { name: 'payment_status', in: 'query', type: 'string', required: false, defaultValue: 'eq.unpaid', description: 'Filter by payment state (eq.unpaid, eq.paid, eq.waived).' },
      { name: 'order', in: 'query', type: 'string', required: false, defaultValue: 'created_at.desc', description: 'Order by date.' },
    ],
    responses: {
      200: {
        description: 'Revenue collection registry array',
        body: [
          {
            id: '7b80a133-e9ef-4bf2-bca4-d83296c00cb5',
            tracking_number: 'BZ-2026-4821',
            fee: 100.00,
            amount_paid: 100.00,
            payment_status: 'paid',
            is_paid: true,
            or_number: 'OR-2026-004812',
            payment_method: 'cash',
            payment_date: '2026-10-26T10:00:00Z',
          },
        ],
      },
    },
    curlSnippet: `curl -X GET "https://qzmxwxmtuzoanwevftnd.supabase.co/rest/v1/document_requests?select=id,tracking_number,fee,payment_status,is_paid,or_number&order=created_at.desc" \\
  -H "apikey: <SUPABASE_ANON_KEY>" \\
  -H "Authorization: Bearer <TREASURER_JWT_TOKEN>"`,
    supabaseJsSnippet: `const { data, error } = await supabase
  .from('document_requests')
  .select('id, tracking_number, purpose, fee, amount_paid, payment_status, is_paid, is_waived, waived_reason, or_number, payment_date, payment_method, resident:profiles(full_name), document_type:document_types(title, fee)')
  .order('created_at', { ascending: false });`,
  },
  {
    id: 'treasurer-record-payment',
    role: 'treasurer',
    tag: 'treasurer',
    method: 'PATCH',
    path: '/rest/v1/document_requests?id=eq.{id}',
    summary: 'Record cash / GCash collection and assign Official Receipt (OR) Number',
    description:
      'Records cash or digital payment received for an approved certificate. Records the Official Receipt (OR) Number, amount collected, payment timestamp, and audit notes.',
    auth: true,
    requiredRoles: ['treasurer', 'super_admin'],
    parameters: [
      { name: 'id', in: 'query', type: 'string', required: true, defaultValue: '7b80a133-e9ef-4bf2-bca4-d83296c00cb5', description: 'UUID of the document request.' },
    ],
    requestBody: {
      payment_status: 'paid',
      is_paid: true,
      payment_method: 'cash',
      or_number: 'OR-2026-004812',
      amount_paid: 100.00,
      payment_date: '2026-10-26T10:00:00Z',
      treasurer_notes: 'Paid in cash at Treasury Window 1. Official Receipt issued.',
    },
    responses: {
      200: {
        description: 'Payment collection recorded in municipal financial ledger',
        body: [{ id: '7b80a133-e9ef-4bf2-bca4-d83296c00cb5', is_paid: true, payment_status: 'paid', or_number: 'OR-2026-004812' }],
      },
    },
    curlSnippet: `curl -X PATCH "https://qzmxwxmtuzoanwevftnd.supabase.co/rest/v1/document_requests?id=eq.7b80a133-e9ef-4bf2-bca4-d83296c00cb5" \\
  -H "apikey: <SUPABASE_ANON_KEY>" \\
  -H "Authorization: Bearer <TREASURER_JWT_TOKEN>" \\
  -H "Content-Type: application/json" \\
  -H "Prefer: return=representation" \\
  -d '{
    "payment_status": "paid",
    "is_paid": true,
    "payment_method": "cash",
    "or_number": "OR-2026-004812",
    "amount_paid": 100.00,
    "payment_date": "2026-10-26T10:00:00Z"
  }'`,
    supabaseJsSnippet: `const { data, error } = await supabase
  .from('document_requests')
  .update({
    payment_status: 'paid',
    is_paid: true,
    payment_method: 'cash',
    or_number: 'OR-2026-004812',
    amount_paid: 100.00,
    payment_date: new Date().toISOString(),
    treasurer_notes: 'Paid in cash at Treasury Window 1.',
  })
  .eq('id', requestId)
  .select();`,
  },
  {
    id: 'treasurer-grant-waiver',
    role: 'treasurer',
    tag: 'treasurer',
    method: 'PATCH',
    path: '/rest/v1/document_requests?id=eq.{id}',
    summary: 'Authorize statutory fee waiver under valid government exemptions',
    description:
      'Officially exempts qualified residents from statutory document fees under statutory laws: Indigency, Senior Citizen (RA 9994), PWD (RA 10754), or First-Time Jobseeker Act (RA 11261).',
    auth: true,
    requiredRoles: ['treasurer', 'super_admin'],
    requestBody: {
      payment_status: 'waived',
      is_waived: true,
      waived_reason: 'First-Time Jobseeker Act (RA 11261)',
      amount_paid: 0.00,
      payment_date: '2026-10-26T10:30:00Z',
      treasurer_notes: 'Statutory fee waiver granted upon submission of Oath of Undertaking under RA 11261.',
    },
    responses: {
      200: {
        description: 'Statutory fee waiver recorded in financial exemption register',
        body: [{ id: '7b80a133-e9ef-4bf2-bca4-d83296c00cb5', is_waived: true, payment_status: 'waived', waived_reason: 'First-Time Jobseeker Act (RA 11261)' }],
      },
    },
    curlSnippet: `curl -X PATCH "https://qzmxwxmtuzoanwevftnd.supabase.co/rest/v1/document_requests?id=eq.7b80a133-e9ef-4bf2-bca4-d83296c00cb5" \\
  -H "apikey: <SUPABASE_ANON_KEY>" \\
  -H "Authorization: Bearer <TREASURER_JWT_TOKEN>" \\
  -H "Content-Type: application/json" \\
  -H "Prefer: return=representation" \\
  -d '{
    "payment_status": "waived",
    "is_waived": true,
    "waived_reason": "First-Time Jobseeker Act (RA 11261)",
    "amount_paid": 0.00
  }'`,
    supabaseJsSnippet: `const { data, error } = await supabase
  .from('document_requests')
  .update({
    payment_status: 'waived',
    is_waived: true,
    waived_reason: 'First-Time Jobseeker Act (RA 11261)',
    amount_paid: 0,
    payment_date: new Date().toISOString(),
    treasurer_notes: 'Statutory exemption validated.',
  })
  .eq('id', requestId);`,
  },

  // =========================================================================
  // SHARED & PUBLIC ROUTES
  // =========================================================================
  {
    id: 'shared-get-doc-types',
    role: 'shared',
    tag: 'shared-and-public',
    method: 'GET',
    path: '/rest/v1/document_types',
    summary: 'Public document catalog, statutory fees, and requirements checklists',
    description:
      'Returns all active official certifications issued by Barangay Zapatera, including Barangay Clearance, Certificate of Indigency, Certificate of Residency, and Business Clearance.',
    auth: false,
    requiredRoles: ['public', 'resident', 'admin', 'super_admin', 'treasurer'],
    parameters: [
      { name: 'select', in: 'query', type: 'string', required: false, defaultValue: '*', description: 'Fields to return.' },
      { name: 'is_active', in: 'query', type: 'string', required: false, defaultValue: 'eq.true', description: 'Filter only actively issued certifications.' },
    ],
    responses: {
      200: {
        description: 'Array of official document types',
        body: [
          {
            id: 'c4e2b090-34ef-479c-9821-4b108849bca0',
            code: 'BRGY_CLEARANCE',
            title: 'Barangay Clearance',
            description: 'Official clearance required for local employment, postal ID, and business permits.',
            fee: 100.00,
            fee_type: 'fixed',
            processing_days: 1,
            requirements: ['CEDULA / Community Tax Certificate', 'Valid Government Issued ID', 'Recent 2x2 Picture'],
            is_active: true,
          },
        ],
      },
    },
    curlSnippet: `curl -X GET "https://qzmxwxmtuzoanwevftnd.supabase.co/rest/v1/document_types?is_active=eq.true" \\
  -H "apikey: <SUPABASE_ANON_KEY>"`,
    supabaseJsSnippet: `const { data, error } = await supabase
  .from('document_types')
  .select('*')
  .eq('is_active', true);`,
  },
  {
    id: 'shared-get-events',
    role: 'shared',
    tag: 'shared-and-public',
    method: 'GET',
    path: '/rest/v1/events',
    summary: 'Community event schedules & public assembly calendar',
    description:
      'Retrieves upcoming barangay assemblies, health missions, clean-up drives, and community festivals with schedule, venue, and target audience.',
    auth: false,
    requiredRoles: ['public', 'resident', 'admin', 'super_admin'],
    parameters: [
      { name: 'order', in: 'query', type: 'string', required: false, defaultValue: 'event_date.asc', description: 'Chronological sorting.' },
    ],
    responses: {
      200: {
        description: 'Community events calendar array',
        body: [
          {
            id: 'fa918021-99ee-4712-ba11-90ca18928371',
            title: 'General Barangay Assembly',
            description: 'Semestral State of the Barangay Address (SOBA) with Punong Barangay and Council.',
            event_date: '2026-11-15T09:00:00Z',
            location: 'Zapatera Gymnasium',
            status: 'upcoming',
          },
        ],
      },
    },
    curlSnippet: `curl -X GET "https://qzmxwxmtuzoanwevftnd.supabase.co/rest/v1/events?order=event_date.asc" \\
  -H "apikey: <SUPABASE_ANON_KEY>"`,
    supabaseJsSnippet: `const { data, error } = await supabase
  .from('events')
  .select('*')
  .order('event_date', { ascending: true });`,
  },

  // =========================================================================
  // EDGE FUNCTIONS & STORAGE
  // =========================================================================
  {
    id: 'edge-send-pickup-email',
    role: 'admin',
    tag: 'edge-functions-and-storage',
    method: 'POST',
    path: '/functions/v1/send-pickup-email',
    summary: 'Dispatch automated document pickup transactional email notification',
    description:
      'Supabase Edge Function written in Deno TypeScript. Sends formatted HTML transactional pickup emails to residents with tracking QR, pickup instructions, and required release documents.',
    auth: true,
    requiredRoles: ['admin', 'super_admin'],
    requestBody: {
      resident_email: 'resident@gmail.com',
      resident_name: 'Juan Dela Cruz',
      tracking_number: 'BZ-2026-4821',
      document_title: 'Barangay Clearance',
      pickup_date: '2026-10-28',
      pickup_time_slot: '09:00 AM - 11:30 AM',
      barangay_name: 'Barangay Zapatera',
      hall_address: '197 D. Jakosalem St., Cebu City',
      contact_phone: '(032) 503-6465',
    },
    responses: {
      200: {
        description: 'Transactional email queued and sent via SMTP',
        body: { success: true, messageId: '<pickup-bz-2026-4821@zapatera.gov.ph>', status: 'dispatched' },
      },
      500: { description: 'SMTP delivery error or missing recipient address' },
    },
    curlSnippet: `curl -X POST "https://qzmxwxmtuzoanwevftnd.supabase.co/functions/v1/send-pickup-email" \\
  -H "apikey: <SUPABASE_ANON_KEY>" \\
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "resident_email": "resident@gmail.com",
    "resident_name": "Juan Dela Cruz",
    "tracking_number": "BZ-2026-4821",
    "document_title": "Barangay Clearance",
    "pickup_date": "2026-10-28"
  }'`,
    supabaseJsSnippet: `const { data, error } = await supabase.functions.invoke('send-pickup-email', {
  body: {
    resident_email: resident.email,
    resident_name: resident.full_name,
    tracking_number: request.tracking_number,
    document_title: docType.title,
    pickup_date: request.pickup_date,
  },
});`,
  },
  {
    id: 'storage-upload-documents',
    role: 'resident',
    tag: 'edge-functions-and-storage',
    method: 'POST',
    path: '/storage/v1/object/documents/{fileName}',
    summary: 'Upload scanned CEDULA, government IDs, and supporting proofs',
    description:
      'Supabase Storage API bucket for authenticated certificate applications. Accepts PNG, JPEG, and PDF documents up to 10MB.',
    auth: true,
    requiredRoles: ['resident', 'admin'],
    parameters: [
      { name: 'fileName', in: 'path', type: 'string', required: true, defaultValue: 'cedula_user_4821.pdf', description: 'Destination storage object path.' },
    ],
    requestBody: 'Binary file payload (multipart/form-data or application/octet-stream)',
    responses: {
      200: {
        description: 'File uploaded into Supabase storage bucket',
        body: { Key: 'documents/cedula_user_4821.pdf' },
      },
    },
    curlSnippet: `curl -X POST "https://qzmxwxmtuzoanwevftnd.supabase.co/storage/v1/object/documents/cedula_user_4821.pdf" \\
  -H "apikey: <SUPABASE_ANON_KEY>" \\
  -H "Authorization: Bearer <RESIDENT_JWT_TOKEN>" \\
  -H "Content-Type: application/pdf" \\
  --data-binary "@./cedula.pdf"`,
    supabaseJsSnippet: `const { data, error } = await supabase.storage
  .from('documents')
  .upload(\`\${residentId}/\${Date.now()}_\${file.name}\`, file, {
    cacheControl: '3600',
    upsert: false,
  });`,
  },
  {
    id: 'realtime-document-requests',
    role: 'shared',
    tag: 'edge-functions-and-storage',
    method: 'WSS',
    path: '/realtime/v1/websocket',
    summary: 'Supabase Realtime WebSocket subscription for live document updates',
    description:
      'Bi-directional WebSocket connection for instant push updates. Emits notifications when an application transitions between pending, approved, paid, and claimed stages.',
    auth: true,
    requiredRoles: ['admin', 'super_admin', 'resident', 'treasurer'],
    requestBody: {
      event: 'postgres_changes',
      schema: 'public',
      table: 'document_requests',
    },
    responses: {
      101: {
        description: 'WebSocket protocol switched to realtime streaming',
        body: { channel: 'realtime:document_requests', event: 'UPDATE', new: { status: 'approved' } },
      },
    },
    curlSnippet: `# Connect with standard WebSocket client or wscat:
wscat -c "wss://qzmxwxmtuzoanwevftnd.supabase.co/realtime/v1/websocket?apikey=<SUPABASE_ANON_KEY>&vsn=1.0.0"`,
    supabaseJsSnippet: `const channel = supabase
  .channel('realtime:document_requests')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'document_requests' }, (payload) => {
    console.log('Realtime change received:', payload);
  })
  .subscribe();`,
  },
];

// Helper to generate a full OpenAPI 3.1.0 compliant JSON schema object
export const generateOpenApiSpec = (supabaseUrl, anonKey) => {
  const paths = {};

  ENDPOINTS.forEach((ep) => {
    const methodLower = ep.method.toLowerCase();
    const cleanPath = ep.path.split('?')[0];

    if (!paths[cleanPath]) {
      paths[cleanPath] = {};
    }

    const operation = {
      tags: [ep.tag],
      summary: ep.summary,
      description: ep.description,
      operationId: ep.id,
      parameters: ep.parameters?.map((p) => ({
        name: p.name,
        in: p.in,
        required: p.required,
        description: p.description,
        schema: { type: p.type, default: p.defaultValue },
      })) || [],
      responses: {},
    };

    if (ep.requestBody) {
      operation.requestBody = {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              example: ep.requestBody,
            },
          },
        },
      };
    }

    Object.entries(ep.responses).forEach(([code, resp]) => {
      operation.responses[code] = {
        description: resp.description,
        content: resp.body ? {
          'application/json': {
            schema: {
              example: resp.body,
            },
          },
        } : undefined,
      };
    });

    if (ep.auth) {
      operation.security = [{ BearerAuth: [] }, { ApiKeyAuth: [] }];
    }

    paths[cleanPath][methodLower] = operation;
  });

  return {
    openapi: '3.1.0',
    info: {
      title: API_METADATA.title,
      version: API_METADATA.version,
      description: API_METADATA.description,
      contact: API_METADATA.contact,
      license: API_METADATA.license,
    },
    servers: [
      {
        url: supabaseUrl || API_METADATA.baseUrl,
        description: 'Barangay Zapatera Supabase Production Endpoint',
      },
    ],
    tags: TAG_GROUPS.map((tg) => ({
      name: tg.name,
      description: tg.description,
    })),
    paths,
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your authenticated user JWT token obtained from Supabase Auth.',
        },
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'apikey',
          description: 'Supabase anon / public API key.',
        },
      },
    },
  };
};
