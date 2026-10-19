# BARANGAY ZAPATERA E-GOVERNANCE & DOCUMENT MANAGEMENT SYSTEM
## System Features, User Roles, and Role-Based Access Control (RBAC) Defense Presentation Guide

**Barangay Zapatera, Cebu City, Philippines**  
*Capstone Defense Presentation Script and System Specification Document*

---

## 1. Executive System Overview and Architecture Purpose

The **Barangay Zapatera E-Governance and Document Management System** is an automated web and mobile public service platform engineered to modernize public governance, document issuance, resident management, and revenue auditing for Barangay Zapatera in Cebu City, Philippines.

The system replaces traditional manual paper queues with an automated, tamper-resistant digital workflow governed by strict **Role-Based Access Control (RBAC)**. In order to maintain institutional accountability, data privacy compliance under **Republic Act 10173 (Data Privacy Act of 2012)**, and financial integrity, the platform partitions system capabilities across five distinct user roles: **Resident**, **Barangay Administrative Staff (Admin)**, **Barangay Treasurer**, **Account Management Specialist**, and **Super Administrator**.

---

## 2. Role: Resident (`resident`)

* **System Interface / Portal:** Resident Native Mobile Application (React Native / Expo) and Responsive Web Portal
* **Role Overview:** The Resident is the primary citizen client of the barangay who uses the mobile and web application to access public services, submit certification requests, track processing status in real time, and receive community advisories without waiting in long queues at the Barangay Hall.

### System Features, Permissions, and Restrictions

#### Feature 2.1: Resident Account Registration and Identity Verification
* **Feature Description:** This feature enables residents residing within Barangay Zapatera to establish an authenticated digital identity by providing their personal demographics and uploading digital proof of residency.
* **Access and CRUD Permissions:** The resident can create a new registration record, input personal details including full name, birthdate, civil status, gender, specific sitio address, residency length, and voter status, and upload government-issued identification cards and proof of residency. The resident can view their own profile information and update personal contact details, civil status, and profile pictures.
* **System Restrictions:** The resident cannot create administrative or staff credentials, cannot view records of other residents, and cannot bypass identity verification.

#### Feature 2.2: Multi-Factor Authentication and Security Lockout Guard
* **Feature Description:** This feature protects resident accounts against brute-force intrusion by monitoring failed login attempts and locking accounts after three consecutive wrong password submissions.
* **Access and CRUD Permissions:** The resident can log into the system using their registered email and password, view active mobile or web session telemetry, and trigger an automated account unlock request to the barangay administration if their account becomes locked due to failed attempts.
* **System Restrictions:** The resident cannot unlock their own locked account without administrative intervention, cannot view security audit logs, and cannot bypass server-side rate limits.

#### Feature 2.3: Resident Operations Dashboard
* **Feature Description:** This feature serves as the resident's home screen, offering quick visual summaries of active applications, barangay emergency telephone hotlines, and published advisories.
* **Access and CRUD Permissions:** The resident can view personalized greeting information, track the real-time processing stage of ongoing requests, view instant hotline numbers for the Barangay Hall, Cebu City Police, and emergency medical responders, and access direct navigation shortcuts to document filing.
* **System Restrictions:** The resident cannot view global barangay statistics, other residents' applications, or internal administrative metrics.

#### Feature 2.4: Official Document Catalog and Requirements Checklist
* **Feature Description:** This feature provides transparent public information regarding all official certifications issued by Barangay Zapatera, including Barangay Clearance, Certificate of Indigency, Certificate of Residency, Business Clearance, Barangay ID, and etc.
* **Access and CRUD Permissions:** The resident can browse the complete catalog of official documents, view applicable statutory fees, examine estimated processing turnaround times, and review required supporting attachments prior to filing.
* **System Restrictions:** The resident cannot modify document guidelines, cannot alter official fees, and cannot delete document offerings from the catalog.

#### Feature 2.5: Online Document Application and Attachment Submission
* **Feature Description:** This feature guides the resident through a step-by-step digital application workflow to file formal certificate requests from any smartphone or computer.
* **Access and CRUD Permissions:** The resident can select a desired certificate, specify the exact legal purpose of request, input required application details, attach scanned images or photos of required documents such as CEDULA or valid IDs, select pickup preferences, review the application summary, and submit the request. Upon submission, the resident receives a unique tracking number formatted as `BZ-YYYY-XXXX`.
* **System Restrictions:** The resident cannot approve their own request, cannot generate or print official certifications, cannot alter assessed fees, and cannot edit submitted applications once administrative review has commenced.

#### Feature 2.6: Live Request Lifecycle Tracker and Resubmission Workflow
* **Feature Description:** This feature allows residents to monitor the progress of their submitted requests from initial pending submission to final document pickup, and permits correction of flawed submissions.
* **Access and CRUD Permissions:** The resident can view the real-time processing status across all stages including Pending, In Review, Approved, Ready for Pickup, and Claimed. If an application is marked as declined or flagged for resubmission due to invalid or blurry attachments, the resident can view specific administrative remarks, replace or upload corrected documents, and resubmit the application under the exact same tracking number without starting a new request.
* **System Restrictions:** The resident cannot view or track applications submitted by other residents, cannot alter administrative notes, and cannot delete requests that have already been approved or processed.

#### Feature 2.7: Barangay Public Bulletins, Announcements, and Citizen Engagement
* **Feature Description:** This feature keeps the community informed with verified advisories, disaster alerts, scheduled barangay programs, and public assemblies published by barangay officials.
* **Access and CRUD Permissions:** The resident can read published barangay news, view calendar schedules of community events, inspect pinned emergency bulletins, and post interactive comments or inquiries on published news threads.
* **System Restrictions:** The resident cannot publish, edit, pin, or delete official announcements, and cannot moderate or delete comments posted by other residents.

#### Feature 2.8: Real-Time Notification Center and Cellphone Push Alerts
* **Feature Description:** This feature notifies residents immediately whenever their application status progresses or when urgent community notices are posted.
* **Access and CRUD Permissions:** The resident can receive and view automated in-app notifications and browser or cellphone alerts regarding document approval, pickup readiness, fee payment instructions, or resubmission notices, and can mark notifications as read.
* **System Restrictions:** The resident cannot broadcast notifications or send unsolicited messages to other system users.

#### Feature 2.9: Resident Profile and Credential Management
* **Feature Description:** This feature allows residents to maintain their contact details and update account security settings.
* **Access and CRUD Permissions:** The resident can view and update their mobile phone number, emergency contact person, civil status, and profile avatar, and can securely change their account password.
* **System Restrictions:** The resident cannot alter their assigned role, cannot modify voter verification records, and cannot alter audit trail history.

---

## 3. Role: Barangay Administrative Staff / Admin (`admin`)

* **System Interface / Portal:** Barangay Admin Operations Web Portal
* **Role Overview:** The Barangay Administrative Staff member operates the administrative portal to evaluate resident document applications, inspect uploaded proofs, generate tamper-proof digital certificates, publish community notices, and assist residents with account lockouts.

### System Features, Permissions, and Restrictions

#### Feature 3.1: Barangay Administrative Operations Dashboard
* **Feature Description:** This feature provides operational staff with an aggregated overview of daily barangay transactions, workload queues, and service metrics.
* **Access and CRUD Permissions:** The administrative staff member can view total application counts, pending review queues, approved certificates ready for release, declined request tallies, and upcoming scheduled community activities.
* **System Restrictions:** The staff member cannot modify global barangay institutional configurations, cannot change system branding, and cannot delete system audit records.

#### Feature 3.2: Document Application Processing and Evaluation Queue
* **Feature Description:** This feature serves as the central processing inbox where staff review incoming citizen applications and examine uploaded supporting requirements.
* **Access and CRUD Permissions:** The staff member can search and filter requests by tracking number, resident name, sitio, or status, view resident profiles, and inspect attached documents using the built-in File Preview Modal. The staff member can update application statuses to In Review, Approved, Declined, or Resubmission Requested, set estimated pickup dates, and append mandatory administrative remarks explaining approval requirements or rejection reasons. The staff member can also soft-delete fraudulent or duplicate requests into the archive with audit logging.
* **System Restrictions:** The staff member cannot approve requests without validating uploaded requirements, cannot waive statutory fees without treasurer authorization, and cannot record cash payments.

#### Feature 3.3: Approved Documents Registry and Claiming Management
* **Feature Description:** This feature organizes all approved certifications that have been cleared for physical release or claiming at the Barangay Hall.
* **Access and CRUD Permissions:** The staff member can view and filter approved applications awaiting pickup, verify the physical identity of the claiming resident, and update the status to Claimed upon handing over the certificate while recording the release timestamp and claiming officer identity.
* **System Restrictions:** The staff member cannot delete claimed records without generating a supervisory audit trail.

#### Feature 3.4: Automated Digital Certificate Generator and Printing Engine
* **Feature Description:** This feature dynamically creates standardized, legally compliant official certifications bearing the official seal of Barangay Zapatera, city logos, tracking codes, and signature blocks.
* **Access and CRUD Permissions:** The staff member can generate formatted digital certificates for Barangay Clearance, Certificate of Indigency, Certificate of Residency, Business Clearance, Barangay ID, and etc. The staff member can preview certificates complete with anti-fraud QR tracking codes and watermark seals, and can print or export the documents directly to PDF for official signing and issuance.
* **System Restrictions:** The staff member cannot alter the official barangay seal, modify official letterhead templates, or forge tracking numbers.

#### Feature 3.5: Official Document Guidelines and Requirements Management
* **Feature Description:** This feature allows administrative staff to maintain accurate public guidelines and requirements lists for each document type.
* **Access and CRUD Permissions:** The staff member can view and update document processing descriptions, required attachments checklists, processing turnaround times, and special instructions for applicants.
* **System Restrictions:** The staff member cannot alter core database schemas or delete statutory certificate offerings without SuperAdmin authorization.

#### Feature 3.6: Barangay Public Bulletins and Announcements Publishing
* **Feature Description:** This feature provides a content management tool for drafting and broadcasting official announcements to the resident portal.
* **Access and CRUD Permissions:** The staff member can create, view, edit, publish, pin, and delete barangay news, community advisories, disaster warnings, and event calendar dates, and can upload promotional banners.
* **System Restrictions:** The staff member cannot post unverified or unauthorized non-barangay notices.

#### Feature 3.7: Resident Account Security and Lockout Assistance
* **Feature Description:** This feature allows administrative staff to assist legitimate residents who have locked themselves out of their accounts due to three consecutive failed password attempts.
* **Access and CRUD Permissions:** The staff member can search resident profiles, verify resident identity, view account lock status, and execute an administrative unlock that resets the failed attempt counter to zero and restores resident portal access.
* **System Restrictions:** The staff member cannot view plaintext resident passwords, cannot change user roles, and cannot create or delete administrator accounts.

#### Feature 3.8: Archive and Soft-Delete Recovery Management
* **Feature Description:** This feature acts as an operational recycle bin to protect against accidental deletion of document records.
* **Access and CRUD Permissions:** The staff member can view soft-deleted document requests within the archive and restore erroneously deleted requests back to active processing queues.
* **System Restrictions:** The staff member cannot permanently destroy or purge database records, as permanent purging is strictly restricted to the Super Administrator.

#### Feature 3.9: Operational Processing Reports and Export
* **Feature Description:** This feature generates quantitative summaries regarding barangay document issuance volume, processing speed, and demographic demand.
* **Access and CRUD Permissions:** The staff member can filter operational statistics by custom date ranges and document categories, and can export structured reports into PDF, CSV spreadsheet, or printable summary formats.
* **System Restrictions:** The staff member cannot alter historical transaction numbers or access database server configurations.

#### Feature 3.10: Administrative Action History Logs
* **Feature Description:** This feature maintains an immutable audit trail of all actions executed by staff members to ensure complete operational transparency.
* **Access and CRUD Permissions:** The staff member can view a chronological log of administrative actions including request approvals, rejections, resubmission flags, certificate prints, and resident unlocks.
* **System Restrictions:** The staff member cannot edit, alter, or delete any log entry within the audit trail.

#### Feature 3.11: Staff Account Profile and Security Settings
* **Feature Description:** This feature allows administrative personnel to maintain their own system profile and login credentials.
* **Access and CRUD Permissions:** The staff member can view and update their personal profile information, contact number, and avatar, and can securely change their login password.
* **System Restrictions:** The staff member cannot elevate their own administrative privileges or reassign their own role.

---

## 4. Role: Barangay Treasurer (`treasurer`)

* **System Interface / Portal:** Dedicated Barangay Treasurer Financial Web Portal
* **Role Overview:** The Barangay Treasurer is the financial governance officer responsible for auditing document fees, logging cash collections, issuing Official Receipts (OR), recording fee waivers, and generating government accounting reports under strict Separation of Duties.

### System Features, Permissions, and Restrictions

#### Feature 4.1: Financial Collection Dashboard and Real-Time Revenue Metrics
* **Feature Description:** This feature gives the Treasurer live financial intelligence regarding daily and monthly revenue performance across all document transactions.
* **Access and CRUD Permissions:** The Treasurer can view real-time calculations of Total Revenue Collected, Today's Cash Collections, Current Month Revenue, Unpaid/Pending Document Fees, and Fee-Exempt/Waived Transactions.
* **System Restrictions:** The Treasurer cannot evaluate document applications, approve certificates, or alter resident application guidelines.

#### Feature 4.2: Payment Collections and Official Receipt (OR) Registry
* **Feature Description:** This feature serves as the central cash register and financial ledger linked directly to all processed document requests.
* **Access and CRUD Permissions:** The Treasurer can view all document requests with assessed fee amounts, applicant names, document types, tracking numbers, and payment statuses. The Treasurer can update payment records by entering the official government Official Receipt (OR) Number, selecting the payment method such as Cash or GCash, inputting the exact amount paid, recording the payment date timestamp, and entering audit remarks. Furthermore, the Treasurer can officially authorize fee waivers for legally qualified residents under valid statutory grounds such as Indigency Certification, Senior Citizen status, PWD status, or the First-Time Jobseeker Act (Republic Act 11261).
* **System Restrictions:** Under database Row-Level Security policies, the Treasurer cannot insert or delete document requests, cannot issue digital certificates, and cannot alter application review statuses.

#### Feature 4.3: Revenue Breakdown Analytics by Document Type
* **Feature Description:** This feature displays graphical and proportional revenue breakdowns illustrating the financial contribution of each document classification.
* **Access and CRUD Permissions:** The Treasurer can view comparative income charts, collection volume percentages, and paid-versus-waived transaction ratios across all document classifications.
* **System Restrictions:** This is a read-only financial analytics module.

#### Feature 4.4: Official Financial Collection Reports and Audit Registers
* **Feature Description:** This feature generates formal accounting reports required for barangay financial auditing and reporting to higher government bodies.
* **Access and CRUD Permissions:** The Treasurer can filter financial records by date ranges, payment status, or receipt numbers, and can generate and export Daily Cash Collection Reports, Monthly Revenue Summaries, Official Receipt Registers, and Fee Exemption Ledgers in PDF, CSV spreadsheet, or formatted print layouts.
* **System Restrictions:** The Treasurer cannot falsify reconciled financial records or delete historical financial logs.

#### Feature 4.5: Treasurer Account Profile and Security Settings
* **Feature Description:** This feature enables the Treasurer to maintain personal profile details and security credentials.
* **Access and CRUD Permissions:** The Treasurer can view and update their profile details and change their secure login password.
* **System Restrictions:** The Treasurer cannot reassign their own role or grant financial recording authority to non-treasury personnel.

---

## 5. Role: Account Management Specialist (`accountmanagement`)

* **System Interface / Portal:** Dedicated User Provisioning & Account Governance Web Portal
* **Role Overview:** The Account Management Specialist serves as the identity and access management officer, responsible for provisioning authorized personnel accounts across all roles, monitoring brute-force security lockouts, managing the account archive, and customizing login branding.

### System Features, Permissions, and Restrictions

#### Feature 5.1: Role-Based User Account Provisioning and Administration
* **Feature Description:** This feature provides an administrative directory for creating and configuring verified user accounts across all supported system roles.
* **Access and CRUD Permissions:** The specialist can create and provision new accounts for Barangay Administrative Staff, Barangay Treasurers, Super Administrators, and Residents. The specialist can enforce strict institutional password complexity rules, validate email formats, assign operational roles, edit user demographic records, and soft-delete inactive or terminated accounts into the archive.
* **System Restrictions:** The specialist cannot process document applications, generate digital certificates, or collect financial payments.

#### Feature 5.2: Security Governance and Account Lockout Resolution Queue
* **Feature Description:** This feature tracks accounts that have triggered the automated 3-consecutive-failed-attempt security lockout guard.
* **Access and CRUD Permissions:** The specialist can inspect the queue of locked user accounts, examine failed attempt counters, verify user identities, and execute an administrative unlock to restore access, or manually lock compromised accounts.
* **System Restrictions:** The specialist cannot view plaintext user passwords and cannot bypass audit logging during security modifications.

#### Feature 5.3: Login Screen Design and Portal Branding CMS
* **Feature Description:** This feature enables visual customization of the portal login screen to match Barangay Zapatera branding standards.
* **Access and CRUD Permissions:** The specialist can view, configure, and publish custom login background imagery, portal titles, welcome messages, and institutional subtitles.
* **System Restrictions:** The specialist cannot modify authentication security algorithms, session timeout parameters, or database schemas.

#### Feature 5.4: User Account Archive and Restoration Management
* **Feature Description:** This feature stores deactivated or soft-deleted user profiles to safeguard against accidental account termination.
* **Access and CRUD Permissions:** The specialist can view archived user accounts and restore deactivated accounts back to active status when authorized.
* **System Restrictions:** The specialist cannot permanently purge accounts from the database without SuperAdmin authority.

#### Feature 5.5: Identity and Account Security Activity Logs
* **Feature Description:** This feature maintains an immutable audit trail of all identity administration operations.
* **Access and CRUD Permissions:** The specialist can view and review chronological logs of user account creations, role changes, account lockouts, and administrative unlocks.
* **System Restrictions:** The specialist cannot edit, modify, or delete identity activity logs.

---

## 6. Role: Super Administrator (`super_admin`)

* **System Interface / Portal:** SuperAdmin Master Web Portal
* **Role Overview:** The Super Administrator is the master authority of the entire ecosystem, holding comprehensive governance over system configurations, statutory document rules, barangay officials directories, user identities, enterprise archive purges, and security audit trails.

### System Features, Permissions, and Restrictions

#### Feature 6.1: Executive Master System Dashboard
* **Feature Description:** This feature provides enterprise-level visibility across all subsystems, operational queues, and administrative departments.
* **Access and CRUD Permissions:** The Super Administrator can view consolidated real-time analytics including total registered users across all roles, total document applications processed, certificate issuance counts, financial revenue summaries, active security alerts, and monthly operational trends.
* **System Restrictions:** None within the scope of the system.

#### Feature 6.2: Global User Account and Role Governance
* **Feature Description:** This feature gives the Super Administrator unrestricted authority over all user identities within the platform.
* **Access and CRUD Permissions:** The Super Administrator can create, view, update, deactivate, restore, or delete any account across all five roles, assign or revoke administrative privileges, reset credentials, and resolve security lockouts.
* **System Restrictions:** The Super Administrator cannot retrieve plaintext user passwords, as credentials are protected by one-way cryptographic hashing.

#### Feature 6.3: Official Document Template Engine and Guidelines Governance
* **Feature Description:** This feature controls the statutory parameters and document templates used for digital certificate generation.
* **Access and CRUD Permissions:** The Super Administrator can create, view, update, and delete document types, configure standard processing times, establish baseline fees, define required supporting documents, and modify official template layouts.
* **System Restrictions:** None.

#### Feature 6.4: Barangay Public Bulletins, Advisories, and Community Governance
* **Feature Description:** This feature provides complete oversight over all public announcements and community discussions.
* **Access and CRUD Permissions:** The Super Administrator can publish, edit, pin, categorize, and delete news, disaster warnings, and community events, and can moderate or remove inappropriate resident comments.
* **System Restrictions:** None.

#### Feature 6.5: Global System Configuration and Barangay Institutional Branding
* **Feature Description:** This feature manages core barangay institutional data and dynamic signatories for digital certificates.
* **Access and CRUD Permissions:** The Super Administrator has exclusive authority to configure official barangay information including official name, municipality, province, address, official email, and emergency contact numbers, upload the official Barangay Zapatera Seal, Cebu City Seal, and background watermarks, and manage the Barangay Officials Directory containing the names and designations of the Punong Barangay (Captain) and Barangay Councilors (Kagawad) that dynamically populate digital certificates.
* **System Restrictions:** This feature is exclusive to the Super Administrator; no other role is permitted to modify these institutional configurations.

#### Feature 6.6: Enterprise Archive and Permanent Database Purging
* **Feature Description:** This feature serves as the centralized master repository for all soft-deleted records across all modules.
* **Access and CRUD Permissions:** The Super Administrator can view all archived document requests, user profiles, announcements, and logs, restore any soft-deleted record back to active database tables, or execute permanent database purges to completely destroy obsolete records.
* **System Restrictions:** Permanent record purging requires explicit administrative confirmation and is permanently recorded in the audit trail.

#### Feature 6.7: Immutable Enterprise Security Audit Trail
* **Feature Description:** This feature provides an immutable, tamper-evident security audit log recording every transaction and event across the platform.
* **Access and CRUD Permissions:** The Super Administrator can search, filter, and review comprehensive audit records covering user logins, 3-attempt lockouts, administrative unlocks, request status transitions, digital certificate print operations, payment entries, and configuration updates, and can export audit logs for external compliance review.
* **System Restrictions:** The Super Administrator cannot edit, modify, or erase audit trail entries, ensuring absolute non-repudiation.

#### Feature 6.8: Cross-Departmental Comprehensive Reports and Intelligence
* **Feature Description:** This feature aggregates operational, financial, and demographic data into master analytical reports.
* **Access and CRUD Permissions:** The Super Administrator can generate, filter, and export system-wide reports combining document issuance volume, processing efficiency, revenue collection reconciliations, and geographic demand across Sitios into PDF, Excel, or formatted print layouts.
* **System Restrictions:** None.

#### Feature 6.9: Super Administrator Profile and Credential Security
* **Feature Description:** This feature allows the Super Administrator to maintain personal administrative details and high-security credentials.
* **Access and CRUD Permissions:** The Super Administrator can update their profile information and change master login passwords.
* **System Restrictions:** None.

---

## 7. Comparative Permissions and Features Matrix

| System Feature / Functional Module | Resident | Admin / Staff | Treasurer | Account Mgmt | Super Admin | Classification |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **Resident Self-Registration & Onboarding** | **Yes** | No | No | No | No | **Exclusive (Resident)** |
| **Browse Document Catalog & Guidelines** | View Only | Manage | View Only | No | Full CRUD | **Shared** |
| **Submit Document Application Online** | **Yes** | No | No | No | No | **Exclusive (Resident)** |
| **Track Request Status & Resubmit Flagged** | **Yes** | No | No | No | No | **Exclusive (Resident)** |
| **Review, Approve & Decline Applications** | No | **Full** | No | No | **Full** | **Exclusive (Admin/SuperAdmin)** |
| **Generate & Print Digital Certificates** | No | **Full** | No | No | **Full** | **Exclusive (Admin/SuperAdmin)** |
| **Mark Document as Claimed / Released** | No | **Yes** | No | No | **Yes** | **Exclusive (Admin/SuperAdmin)** |
| **Record Fee Payment & Official Receipt (OR#)** | No | No | **Full** | No | View / Audit | **Exclusive (Treasurer)** |
| **Authorize Fee Waivers & Indigent Exemptions** | No | No | **Full** | No | **Full** | **Exclusive (Treasurer/SuperAdmin)** |
| **Financial Collection & Cash Reports** | No | No | **Full** | No | **Comprehensive** | **Exclusive (Treasurer/SuperAdmin)** |
| **User Account Provisioning & Role Setup** | No | No | No | **Full** | **Full** | **Exclusive (AcctMgmt/SuperAdmin)** |
| **Unlock 3-Attempt Security Locked Accounts** | Request | **Yes** | No | **Yes** | **Full** | **Shared (Admin/AcctMgmt/SuperAdmin)** |
| **Login Screen Design CMS & Branding** | No | No | No | **Full** | **Full** | **Exclusive (AcctMgmt/SuperAdmin)** |
| **Publish Announcements & Community News** | No | **Full** | No | No | **Full** | **Exclusive (Admin/SuperAdmin)** |
| **Post Comments on Published Bulletins** | **Yes** | **Yes** | No | No | Moderate | **Shared** |
| **Manage Barangay Officials Directory** | No | No | No | No | **Full** | **Exclusive (SuperAdmin)** |
| **Global System Config & Seal Watermarks** | No | No | No | No | **Full** | **Exclusive (SuperAdmin)** |
| **Archive: Restore Soft-Deleted Records** | No | Requests | No | Accounts | **All Records** | **Role-Scoped Shared** |
| **Archive: Permanent Database Purge** | No | No | No | No | **Exclusive** | **Exclusive (SuperAdmin)** |
| **Immutable Security Audit Trail Access** | No | Operational | No | Security | **Complete** | **Shared Audit** |

---

## 8. Key Defense Presentation Talking Points

* **Separation of Duties (SoD) for Financial Integrity:** The architecture strictly separates document processing from fee collection. The Barangay Administrative Staff member can evaluate and approve documents, but is technically restricted from recording cash payments or issuing Official Receipts. Conversely, the Barangay Treasurer logs revenue and issues Official Receipts, but cannot approve document applications or issue certificates. This segregation of duties eliminates fraud, prevents unrecorded collections, and ensures audit accountability.
* **Multi-Layered Security and 3-Attempt Account Lockout Guard:** To protect citizen and administrative accounts against automated brute-force password guessing and credential stuffing attacks, the system tracks consecutive failed attempts at both the application and database tiers. Upon the third consecutive failed attempt, the account is immediately locked, an unlock request record is dispatched, and access is rejected until an authorized administrator verifies the user's identity and performs an administrative unlock.
* **Transparent Resubmission Cycle and Tracking Continuity:** Unlike traditional systems that outright reject incomplete applications, our platform introduces a dedicated Resubmission State. If an applicant uploads an expired ID or illegible proof, administrative staff provide clear deficiency instructions. The resident receives an immediate mobile alert, uploads the corrected attachment directly from their smartphone, and the application resumes processing under the original tracking number (`BZ-YYYY-XXXX`) without filing fees being forfeited.
* **Database-Level Row-Level Security (RLS) Enforcement:** Access restrictions are not merely hidden in the frontend user interface; they are strictly enforced inside the Supabase PostgreSQL database via Row-Level Security policies. Even if an unauthorized user attempts to craft a direct API request to update document statuses or delete records, database policies automatically reject the transaction, guaranteeing data integrity and compliance with Republic Act 10173 (Data Privacy Act of 2012).
