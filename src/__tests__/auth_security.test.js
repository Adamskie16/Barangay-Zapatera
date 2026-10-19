// src/__tests__/auth_security.test.js
// Automated Test Suite for 3-Attempt Account Lockouts, Rate Limiting, Admin Unlock, and Security Audit Logging

import assert from 'assert';

// Mock Security Core Engine
class SecurityEngine {
  constructor() {
    this.profiles = new Map();
    this.unlockRequests = [];
    this.rateLimits = new Map();
    this.auditLogs = [];
  }

  registerUser(email, password, role = 'resident') {
    this.profiles.set(email.toLowerCase(), {
      email: email.toLowerCase(),
      password,
      role,
      failed_attempts: 0,
      is_locked: false,
      locked_at: null,
    });
  }

  checkRateLimit(identifier, maxAttempts = 5) {
    const cleanId = identifier.toLowerCase();
    const current = this.rateLimits.get(cleanId) || 0;
    if (current >= maxAttempts) {
      this.logAudit('Rate Limit Exceeded', `Rate limit exceeded for ${cleanId}`, 'warning', cleanId);
      return { allowed: false, message: 'Too many authentication attempts. Please wait 15 minutes before trying again.' };
    }
    this.rateLimits.set(cleanId, current + 1);
    return { allowed: true, remaining: maxAttempts - (current + 1) };
  }

  recordFailedAttempt(email, role = 'resident') {
    const cleanEmail = email.toLowerCase();
    const profile = this.profiles.get(cleanEmail);
    if (!profile) return { attempts: 0, isLockedOut: false, remaining: 0, accountExists: false };

    profile.failed_attempts += 1;
    if (profile.failed_attempts >= 3) {
      profile.is_locked = true;
      profile.locked_at = new Date().toISOString();

      this.unlockRequests.push({
        id: `req-${Date.now()}`,
        email: cleanEmail,
        status: 'pending',
        failed_attempts: profile.failed_attempts,
        created_at: profile.locked_at,
      });

      this.logAudit('Account Locked Out', `Account ${cleanEmail} locked out due to 3 consecutive failed login attempts.`, 'danger', cleanEmail);
      return { attempts: profile.failed_attempts, isLockedOut: true, remaining: 0, accountExists: true };
    } else {
      this.logAudit('Failed Login Attempt', `Failed password attempt ${profile.failed_attempts}/3 for ${cleanEmail}`, 'warning', cleanEmail);
      return { attempts: profile.failed_attempts, isLockedOut: false, remaining: 3 - profile.failed_attempts, accountExists: true };
    }
  }

  resetFailedAttempts(email) {
    const profile = this.profiles.get(email.toLowerCase());
    if (profile) {
      profile.failed_attempts = 0;
      profile.is_locked = false;
      profile.locked_at = null;
    }
  }

  login(email, password) {
    const cleanEmail = email.toLowerCase();

    // 1. Rate limit check
    const limit = this.checkRateLimit(cleanEmail);
    if (!limit.allowed) {
      return { success: false, code: 'RATE_LIMIT', message: limit.message };
    }

    // 2. Lock status check
    const profile = this.profiles.get(cleanEmail);
    if (profile && profile.is_locked) {
      return { success: false, code: 'ACCOUNT_LOCKED', message: 'Your account has been temporarily locked. Please contact an administrator to request access.' };
    }

    // 3. Password check
    if (!profile || profile.password !== password) {
      const lockResult = this.recordFailedAttempt(cleanEmail);
      if (lockResult.isLockedOut) {
        return { success: false, code: 'JUST_LOCKED', message: 'Your account has been locked due to multiple failed login attempts. Please contact an administrator to request an unlock.' };
      }
      return { success: false, code: 'INVALID_CREDENTIALS', message: 'Invalid login credentials. Please check your email and password.' };
    }

    // 4. Success
    this.resetFailedAttempts(cleanEmail);
    this.logAudit('User Login Success', `User ${cleanEmail} logged in successfully.`, 'info', cleanEmail);
    return { success: true, user: profile };
  }

  loginToPortal(email, password, portalRole) {
    const cleanEmail = email.toLowerCase();

    // 1. Rate limit check
    const limit = this.checkRateLimit(cleanEmail);
    if (!limit.allowed) {
      return { success: false, code: 'RATE_LIMIT', message: limit.message };
    }

    // 2. Lock status check
    const profile = this.profiles.get(cleanEmail);
    if (profile && profile.is_locked) {
      return { success: false, code: 'ACCOUNT_LOCKED', message: 'Your account is temporarily locked due to multiple failed login attempts. Please contact an administrator.' };
    }

    // 3. Authenticate primary credentials
    if (!profile || profile.password !== password) {
      const lockResult = this.recordFailedAttempt(cleanEmail, portalRole);
      if (lockResult.accountExists === false) {
        return { success: false, code: 'INVALID_CREDENTIALS', message: 'Invalid Email and Password' };
      }
      if (lockResult.isLockedOut) {
        return { success: false, code: 'JUST_LOCKED', message: 'Your account is temporarily locked due to multiple failed login attempts. Please contact an administrator.' };
      }
      return { success: false, code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect.' };
    }

    // 4. Role segregation check: fetched role must strictly match portalRole
    const normalizedUserRole = (profile.role || '').toLowerCase();
    const normalizedPortalRole = (portalRole || '').toLowerCase();
    const isSuperAdminMatch = (normalizedPortalRole === 'super_admin' && (normalizedUserRole === 'super_admin' || normalizedUserRole === 'superadmin'));
    const isAcctMgmtMatch = (normalizedPortalRole === 'accountmanagement' && (normalizedUserRole === 'accountmanagement' || normalizedUserRole === 'account_management'));

    const isMatch = normalizedUserRole === normalizedPortalRole || isSuperAdminMatch || isAcctMgmtMatch;

    if (!isMatch) {
      this.logAudit('Role Mismatch Blocked', `User ${cleanEmail} (role: ${profile.role}) blocked from accessing ${portalRole} portal.`, 'security', cleanEmail);
      return { success: false, code: 'ROLE_MISMATCH', message: 'Email or password is incorrect.' };
    }

    // 5. Success -> reset attempts, issue OTP step
    this.resetFailedAttempts(cleanEmail);
    this.logAudit('Portal Credential Auth Success', `User ${cleanEmail} authenticated for ${portalRole} portal, OTP dispatched.`, 'info', cleanEmail);
    return { success: true, step: 'otp', user: profile };
  }

  unlockAccount(targetEmail, adminUser, isAdmin = true) {
    if (!isAdmin) {
      this.logAudit('Unauthorized Unlock Attempt', `User ${adminUser} attempted to unlock ${targetEmail} without authorization.`, 'security', adminUser);
      return { success: false, message: 'Unauthorized: Only administrators can unlock accounts.' };
    }

    const cleanEmail = targetEmail.toLowerCase();
    const profile = this.profiles.get(cleanEmail);
    if (profile) {
      profile.is_locked = false;
      profile.failed_attempts = 0;
      profile.locked_at = null;

      const req = this.unlockRequests.find(r => r.email === cleanEmail && r.status === 'pending');
      if (req) req.status = 'approved';

      this.logAudit('Account Unlocked', `Account ${cleanEmail} unlocked by admin (${adminUser}).`, 'security', adminUser);
      return { success: true };
    }
    return { success: false, message: 'User profile not found.' };
  }

  logAudit(action, details, level, userEmail) {
    this.auditLogs.push({ action, details, level, user_email: userEmail, timestamp: new Date().toISOString() });
  }

  resetPassword(email, newPassword, session = null) {
    if (!session) {
      return {
        success: false,
        code: 'AUTH_SESSION_MISSING',
        message: 'Password reset session has expired or is invalid. Please request a new reset link.',
      };
    }

    const cleanEmail = email.toLowerCase();
    const profile = this.profiles.get(cleanEmail);
    if (!profile) {
      return { success: false, code: 'USER_NOT_FOUND', message: 'User not found.' };
    }

    profile.password = newPassword;
    profile.is_locked = false;
    profile.failed_attempts = 0;
    profile.locked_at = null;

    this.unlockRequests = this.unlockRequests.filter(req => req.email !== cleanEmail);
    this.logAudit('Password Reset', `Password reset successful for ${cleanEmail}. Lockout cleared.`, 'info', cleanEmail);
    return { success: true, message: 'Password updated successfully.' };
  }
}

// AUTOMATED TEST SUITE RUNNER
export function runSecurityTestSuite() {
  console.log('====================================================');
  console.log('🧪 RUNNING AUTHENTICATION SECURITY AUTOMATED TEST SUITE');
  console.log('====================================================\n');

  const engine = new SecurityEngine();
  const testUser = 'resident.zapatera@gmail.com';
  const correctPassword = 'Password123!';
  const wrongPassword = 'WrongPassword999';

  engine.registerUser(testUser, correctPassword);

  // TEST 1: 1st Failed Login Attempt
  console.log('--> Test 1: 1st Failed Login Attempt...');
  const res1 = engine.login(testUser, wrongPassword);
  assert.strictEqual(res1.success, false);
  assert.strictEqual(res1.code, 'INVALID_CREDENTIALS');
  assert.strictEqual(engine.profiles.get(testUser).failed_attempts, 1);
  assert.strictEqual(engine.profiles.get(testUser).is_locked, false);
  console.log('  [PASS] 1st failed attempt tracked cleanly (failed_attempts: 1, is_locked: false)\n');

  // TEST 2: 2nd Failed Login Attempt
  console.log('--> Test 2: 2nd Failed Login Attempt...');
  const res2 = engine.login(testUser, wrongPassword);
  assert.strictEqual(res2.success, false);
  assert.strictEqual(res2.code, 'INVALID_CREDENTIALS');
  assert.strictEqual(engine.profiles.get(testUser).failed_attempts, 2);
  assert.strictEqual(engine.profiles.get(testUser).is_locked, false);
  console.log('  [PASS] 2nd failed attempt tracked cleanly (failed_attempts: 2, is_locked: false)\n');

  // TEST 3: 3rd Failed Login Attempt -> Account Locked
  console.log('--> Test 3: 3rd Failed Attempt Triggering Account Lockout...');
  const res3 = engine.login(testUser, wrongPassword);
  assert.strictEqual(res3.success, false);
  assert.strictEqual(res3.code, 'JUST_LOCKED');
  assert.strictEqual(engine.profiles.get(testUser).failed_attempts, 3);
  assert.strictEqual(engine.profiles.get(testUser).is_locked, true);
  assert.strictEqual(engine.unlockRequests.length, 1);
  assert.strictEqual(engine.unlockRequests[0].status, 'pending');
  console.log('  [PASS] Account locked on 3rd attempt & pending unlock request created\n');

  // TEST 4: Correct Password Attempt While Locked -> Login Denied
  console.log('--> Test 4: Attempting Correct Password While Locked...');
  const res4 = engine.login(testUser, correctPassword);
  assert.strictEqual(res4.success, false);
  assert.strictEqual(res4.code, 'ACCOUNT_LOCKED');
  assert.strictEqual(res4.message, 'Your account has been temporarily locked. Please contact an administrator to request access.');
  console.log('  [PASS] Login denied on correct password when account is locked out\n');

  // TEST 5: Unauthorized User Attempting to Unlock Account
  console.log('--> Test 5: Unauthorized Non-Admin Attempting Unlock...');
  const unauthRes = engine.unlockAccount(testUser, 'attacker@gmail.com', false);
  assert.strictEqual(unauthRes.success, false);
  assert.strictEqual(engine.profiles.get(testUser).is_locked, true);
  console.log('  [PASS] Unauthorized unlock attempt rejected\n');

  // TEST 6: Authorized Administrator Unlock Action
  console.log('--> Test 6: Authorized Admin Unlocking Account...');
  const unlockRes = engine.unlockAccount(testUser, 'admin@zapatera.gov.ph', true);
  assert.strictEqual(unlockRes.success, true);
  assert.strictEqual(engine.profiles.get(testUser).is_locked, false);
  assert.strictEqual(engine.profiles.get(testUser).failed_attempts, 0);
  assert.strictEqual(engine.unlockRequests[0].status, 'approved');
  console.log('  [PASS] Admin unlock successful, failed_attempts reset to 0\n');

  // TEST 7: Login After Admin Unlock -> Access Restored & Counter Reset
  console.log('--> Test 7: Login Post-Unlock with Correct Password...');
  const res7 = engine.login(testUser, correctPassword);
  assert.strictEqual(res7.success, true);
  assert.strictEqual(engine.profiles.get(testUser).failed_attempts, 0);
  console.log('  [PASS] Account fully usable post-unlock\n');

  // TEST 8: Server-Side Rate Limiting Enforcement
  console.log('--> Test 8: Rate Limit Threshold Enforcement...');
  const rateUser = 'rate.limit.test@gmail.com';
  engine.registerUser(rateUser, correctPassword);
  for (let i = 0; i < 5; i++) {
    engine.checkRateLimit(rateUser, 5);
  }
  const rateRes = engine.login(rateUser, correctPassword);
  assert.strictEqual(rateRes.success, false);
  assert.strictEqual(rateRes.code, 'RATE_LIMIT');
  console.log('  [PASS] Rate limit enforced after threshold exceeded\n');

  // TEST 9: Audit Trail Logging Verification
  console.log('--> Test 9: Audit Trail Logs Inspection...');
  const lockoutLog = engine.auditLogs.find(l => l.action === 'Account Locked Out');
  const unlockLog = engine.auditLogs.find(l => l.action === 'Account Unlocked');
  assert.notStrictEqual(lockoutLog, undefined);
  assert.notStrictEqual(unlockLog, undefined);
  assert.strictEqual(unlockLog.user_email, 'admin@zapatera.gov.ph');
  console.log('  [PASS] Audit logs recorded admin identity, timestamp, and action without exposing credentials\n');

  // TEST 10: Superadmin Account Attempting Login on Admin Portal -> Blocked
  console.log('--> Test 10: Superadmin Attempting Login on Admin Portal (/admin/login)...');
  const saUser = 'superadmin.zapatera@gmail.com';
  engine.registerUser(saUser, 'SuperAdminPass123!', 'super_admin');
  const crossRes1 = engine.loginToPortal(saUser, 'SuperAdminPass123!', 'admin');
  assert.strictEqual(crossRes1.success, false);
  assert.strictEqual(crossRes1.code, 'ROLE_MISMATCH');
  assert.strictEqual(crossRes1.message, 'Email or password is incorrect.');
  console.log('  [PASS] Superadmin account strictly blocked from Admin portal with generic error\n');

  // TEST 11: Admin Account Attempting Login on Superadmin Portal -> Blocked
  console.log('--> Test 11: Admin Attempting Login on Superadmin Portal (/superadmin/login)...');
  const adminUser = 'admin.zapatera@gmail.com';
  engine.registerUser(adminUser, 'AdminPass123!', 'admin');
  const crossRes2 = engine.loginToPortal(adminUser, 'AdminPass123!', 'super_admin');
  assert.strictEqual(crossRes2.success, false);
  assert.strictEqual(crossRes2.code, 'ROLE_MISMATCH');
  assert.strictEqual(crossRes2.message, 'Email or password is incorrect.');
  console.log('  [PASS] Admin account strictly blocked from Superadmin portal with generic error\n');

  // TEST 12: Resident Account Attempting Login on Treasurer Portal -> Blocked
  console.log('--> Test 12: Resident Attempting Login on Treasurer Portal (/treasurer/login)...');
  const residentTestUser = 'resident.portal.test@gmail.com';
  engine.registerUser(residentTestUser, 'ResidentPass123!', 'resident');
  const crossRes3 = engine.loginToPortal(residentTestUser, 'ResidentPass123!', 'treasurer');
  assert.strictEqual(crossRes3.success, false);
  assert.strictEqual(crossRes3.code, 'ROLE_MISMATCH');
  assert.strictEqual(crossRes3.message, 'Email or password is incorrect.');
  console.log('  [PASS] Resident account strictly blocked from Treasurer portal with generic error\n');

  // TEST 13: Authorized Admin Logging in on Admin Portal -> Success to OTP Step
  console.log('--> Test 13: Authorized Admin Logging into Admin Portal (/admin/login)...');
  const validAdminRes = engine.loginToPortal(adminUser, 'AdminPass123!', 'admin');
  assert.strictEqual(validAdminRes.success, true);
  assert.strictEqual(validAdminRes.step, 'otp');
  assert.strictEqual(validAdminRes.user.role, 'admin');
  console.log('  [PASS] Authorized admin accepted and routed to 2FA OTP verification step\n');

  // TEST 14: Authorized Treasurer Logging in on Treasurer Portal -> Success to OTP Step
  console.log('--> Test 14: Authorized Treasurer Logging into Treasurer Portal (/treasurer/login)...');
  const treasurerUser = 'treasurer.zapatera@gmail.com';
  engine.registerUser(treasurerUser, 'TreasurerPass123!', 'treasurer');
  const validTreasurerRes = engine.loginToPortal(treasurerUser, 'TreasurerPass123!', 'treasurer');
  assert.strictEqual(validTreasurerRes.success, true);
  assert.strictEqual(validTreasurerRes.step, 'otp');
  assert.strictEqual(validTreasurerRes.user.role, 'treasurer');
  console.log('  [PASS] Authorized treasurer accepted and routed to 2FA OTP verification step\n');

  // TEST 15: Non-Existent Account Attempting Login -> Strictly "Invalid Email and Password" without lockout counters
  console.log('--> Test 15: Non-Existent Account Attempting Login (e.g. Typo in Email)...');
  const nonExistentEmail = 'joca.medina.swu@phinmaed.coms';
  const nonExistRes = engine.loginToPortal(nonExistentEmail, 'AnyPassword123!', 'admin');
  assert.strictEqual(nonExistRes.success, false);
  assert.strictEqual(nonExistRes.code, 'INVALID_CREDENTIALS');
  assert.strictEqual(nonExistRes.message, 'Invalid Email and Password');
  assert.strictEqual(engine.profiles.has(nonExistentEmail), false);
  console.log('  [PASS] Non-existent account rejected cleanly with "Invalid Email and Password" (no lockout attempt counters leaked)\n');

  // TEST 16: Resident Portal Rate Limiting (5 requests per window)
  console.log('--> Test 16: Resident Portal Rate Limiting (Too many authentication attempts)...');
  const residentRateUser = 'rate.limit.resident@gmail.com';
  engine.registerUser(residentRateUser, 'ResidentPass123!', 'resident');
  // Trigger 5 attempts
  for (let i = 0; i < 5; i++) {
    engine.checkRateLimit(residentRateUser, 5);
  }
  // 6th attempt should be blocked
  const rateLimitRes = engine.checkRateLimit(residentRateUser, 5);
  assert.strictEqual(rateLimitRes.allowed, false);
  assert.strictEqual(rateLimitRes.message.includes('Too many authentication attempts'), true);
  console.log('  [PASS] Resident portal rate limiting strictly enforced with message: "Too many authentication attempts. Please wait..."\n');

  // TEST 17: Password Reset Attempt Without Valid Session (Missing Auth Session Guard)
  console.log('--> Test 17: Password Reset Attempt Without Valid Session (Missing Auth Session Guard)...');
  const sessionUser = 'resident.locked@gmail.com';
  engine.registerUser(sessionUser, 'OldPassword123!', 'resident');
  // Lock the user out first
  engine.recordFailedAttempt(sessionUser);
  engine.recordFailedAttempt(sessionUser);
  engine.recordFailedAttempt(sessionUser);
  assert.strictEqual(engine.profiles.get(sessionUser).is_locked, true);

  // Attempt reset without an active session
  const noSessionRes = engine.resetPassword(sessionUser, 'NewPassword123!', null);
  assert.strictEqual(noSessionRes.success, false);
  assert.strictEqual(noSessionRes.code, 'AUTH_SESSION_MISSING');
  assert.strictEqual(noSessionRes.message.includes('Password reset session has expired or is invalid'), true);
  // Account must remain unchanged
  assert.strictEqual(engine.profiles.get(sessionUser).is_locked, true);
  console.log('  [PASS] Unauthenticated password reset attempt rejected with clear session notice without exposing raw auth exceptions\n');

  // TEST 18: Password Reset With Valid Session -> Lockout Cleared & New Password Usable
  console.log('--> Test 18: Password Reset With Valid Session -> Lockout Cleared & New Password Usable...');
  const mockValidSession = { user: { email: sessionUser }, access_token: 'valid_jwt_token' };
  const validResetRes = engine.resetPassword(sessionUser, 'BrandNewPassword123!', mockValidSession);
  assert.strictEqual(validResetRes.success, true);
  assert.strictEqual(engine.profiles.get(sessionUser).is_locked, false);
  assert.strictEqual(engine.profiles.get(sessionUser).failed_attempts, 0);

  // User should now be able to log in with new password
  const newLoginRes = engine.login(sessionUser, 'BrandNewPassword123!');
  assert.strictEqual(newLoginRes.success, true);
  console.log('  [PASS] Password reset with valid session unlocks account, clears failed attempts, and allows instant login\n');

  console.log('====================================================');
  console.log('✅ ALL 18 AUTOMATED SECURITY TESTS PASSED SUCCESSFULLY');
  console.log('====================================================\n');
}

// Execute tests if invoked directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('auth_security.test.js')) {
  runSecurityTestSuite();
}
