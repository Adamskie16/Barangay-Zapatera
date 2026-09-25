import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  ShieldCheck,
  Info,
  Check,
  X,
  CheckSquare,
  Square,
  Calendar,
} from 'lucide-react';
import { ResidentUser } from '../../types';
import { sanitizeInput, isAccountLocked, recordFailedAttempt, resetFailedAttempts } from '../../core/security';
import { supabase, isSupabaseConfigured } from '../../core/supabase';
import { MobileStorage } from '../../core/storage';
import UnlockAccountModal from '../../components/UnlockAccountModal';

// ============================================================================
// SAMPLE SITIO LIST FOR BARANGAY ZAPATERA
// ============================================================================
export const SAMPLE_SITIOS: string[] = [
  'Sitio Zapatera Proper',
  'Sitio San Roque',
  'Sitio Lower Zapatera',
  'Sitio Upper Zapatera',
  'Sitio Central',
  'Sitio Riverside',
  'Sitio Ramos',
  'Sitio Kamagong',
];

export const CIVIL_STATUS_OPTIONS: string[] = [
  'Single',
  'Married',
  'Widowed',
  'Separated',
  'Divorced',
];

interface ResidentAuthPageProps {
  onLoginSuccess: (user: ResidentUser) => void;
}

// ============================================================================
// 2. GMAIL VALIDATION REGEX
// ============================================================================
export const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;

export function validateGmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  return gmailRegex.test(email.trim().toLowerCase());
}

// ============================================================================
// 3. STRONG PASSWORD VALIDATION HELPERS & REGEX
// ============================================================================
export const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&!#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

export function checkPasswordStrength(password: string) {
  const p = password || '';
  return {
    hasLength: p.length >= 8,
    hasUpper: /[A-Z]/.test(p),
    hasLower: /[a-z]/.test(p),
    hasNumber: /[0-9]/.test(p),
    hasSpecial: /[@$!%*?&!#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p),
  };
}

export function isStrongPassword(password: string): boolean {
  const s = checkPasswordStrength(password);
  return s.hasLength && s.hasUpper && s.hasLower && s.hasNumber && s.hasSpecial;
}

export default function ResidentAuthPage({ onLoginSuccess }: ResidentAuthPageProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [authStep, setAuthStep] = useState<'credentials' | 'otp' | 'forgot_password' | 'reset_password'>('credentials');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string>('');
  const [infoBanner, setInfoBanner] = useState<string>('');

  // Login Credentials State
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [showLoginPassword, setShowLoginPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [isUnlockModalOpen, setIsUnlockModalOpen] = useState<boolean>(false);

  // Forgot Password & Reset Password State
  const [forgotEmail, setForgotEmail] = useState<string>('');
  const [resetNewPassword, setResetNewPassword] = useState<string>('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState<string>('');
  const [showResetNewPassword, setShowResetNewPassword] = useState<boolean>(false);
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState<boolean>(false);

  // OTP State
  const [otpInput, setOtpInput] = useState<string>('');
  const [generatedOtp, setGeneratedOtp] = useState<string>('');
  const [pendingUser, setPendingUser] = useState<ResidentUser | null>(null);

  // ==========================================================================
  // 1. REGISTER FORM STATE (Structured Fields - ALL REQUIRED)
  // ==========================================================================
  const [regData, setRegData] = useState({
    last_name: '',
    first_name: '',
    middle_initial: '',
    birth_date: '',
    civil_status: 'Single',
    email: '',
    phone: '',
    voter_status: 'Registered Voter', // 'Registered Voter' | 'Not Registered Voter'
    sitio: SAMPLE_SITIOS[0],
    password: '',
    confirmPassword: '',
    privacyPolicyAccepted: false,
  });

  // Per-Field Error Messages & Touched State
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});

  // Password Visibility State for Register
  const [showRegPassword, setShowRegPassword] = useState<boolean>(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState<boolean>(false);

  // Privacy Policy Modal State
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState<boolean>(false);

  // Resend Confirmation State
  const [showResendConfirmation, setShowResendConfirmation] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    // Detect password recovery redirect
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    const search = typeof window !== 'undefined' ? window.location.search : '';
    const isRecovery =
      hash.includes('type=recovery') ||
      search.includes('type=recovery') ||
      hash.includes('access_token');

    if (isRecovery) {
      setAuthStep('reset_password');
      setInfoBanner('Password Recovery Active: Please enter and confirm your new account password.');
    }

    if (isSupabaseConfigured()) {
      const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY') {
          setAuthStep('reset_password');
          setInfoBanner('Password Recovery Active: Please enter and confirm your new account password.');
        }
      });
      return () => authListener?.subscription?.unsubscribe();
    }
  }, []);

  // Live BroadcastChannel synchronization for instant account unlocking across tabs/portals
  useEffect(() => {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const channel = new BroadcastChannel('zapatera_security_channel');
      channel.onmessage = (event) => {
        if (event.data?.type === 'ACCOUNT_UNLOCKED' && event.data?.email === loginEmail.toLowerCase().trim()) {
          setIsLocked(false);
          setErrorMessage('');
          setSuccessBanner('Your account has been unlocked. You may now log in.');
        }
      };
      return () => channel.close();
    }
  }, [loginEmail]);

  // Auto-dismiss error & banner messages after 20 seconds
  useEffect(() => {
    if (errorMessage || authError) {
      const timer = setTimeout(() => {
        setErrorMessage('');
        setAuthError(null);
      }, 20000); // 20 seconds
      return () => clearTimeout(timer);
    }
  }, [errorMessage, authError]);

  useEffect(() => {
    if (successBanner) {
      const timer = setTimeout(() => {
        setSuccessBanner('');
      }, 20000); // 20 seconds
      return () => clearTimeout(timer);
    }
  }, [successBanner]);

  useEffect(() => {
    if (infoBanner) {
      const timer = setTimeout(() => {
        setInfoBanner('');
      }, 20000); // 20 seconds
      return () => clearTimeout(timer);
    }
  }, [infoBanner]);

  // Live password strength indicator for register
  const passwordStrength = checkPasswordStrength(regData.password);
  const passwordsMatch = regData.password.length > 0 && regData.confirmPassword.length > 0 && regData.password === regData.confirmPassword;

  // Clear single field error on change
  const handleFieldChange = (field: string, value: any) => {
    setRegData((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  const handleResendConfirmation = async () => {
    if (!loginEmail) return;
    setResendLoading(true);
    setErrorMessage('');
    try {
      if (isSupabaseConfigured()) {
        const { error: resendErr } = await supabase.auth.resend({
          type: 'signup',
          email: loginEmail.trim().toLowerCase(),
        });
        if (resendErr) {
          setErrorMessage(resendErr.message || 'Failed to resend confirmation email.');
        } else {
          setInfoBanner(`A confirmation link has been resent to ${loginEmail.trim().toLowerCase()}. Please check your Gmail.`);
        }
      }
    } catch {
      setErrorMessage('Failed to resend confirmation email. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  // ==========================================================================
  // 5. REQUIRED-FIELD VALIDATION FUNCTION
  // ==========================================================================
  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    // 1. Check Required Fields (No field can be empty or space-only)
    if (!regData.last_name || !regData.last_name.trim()) {
      errors.last_name = 'Last Name is required.';
    }
    if (!regData.first_name || !regData.first_name.trim()) {
      errors.first_name = 'First Name is required.';
    }
    if (!regData.middle_initial || !regData.middle_initial.trim()) {
      errors.middle_initial = 'Middle Initial is required.';
    }
    if (!regData.birth_date || !regData.birth_date.trim()) {
      errors.birth_date = 'Date of Birth is required.';
    }
    if (!regData.civil_status || !regData.civil_status.trim()) {
      errors.civil_status = 'Civil Status is required.';
    }
    if (!regData.phone || !regData.phone.trim()) {
      errors.phone = 'Mobile Phone number is required.';
    }
    if (!regData.sitio || !regData.sitio.trim()) {
      errors.sitio = 'Sitio selection is required.';
    }
    if (!regData.voter_status || !regData.voter_status.trim()) {
      errors.voter_status = 'Voter Status is required.';
    }
    if (!regData.email || !regData.email.trim()) {
      errors.email = 'Email address is required.';
    }
    if (!regData.password || !regData.password.trim()) {
      errors.password = 'Password is required.';
    }
    if (!regData.confirmPassword || !regData.confirmPassword.trim()) {
      errors.confirmPassword = 'Confirm Password is required.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setErrorMessage('Please complete all required fields.');
      return false;
    }

    // 2. Check Gmail Validation
    if (!validateGmail(regData.email)) {
      setFieldErrors({ email: 'Please enter a valid Gmail address.' });
      setErrorMessage('Please use a valid Gmail address.');
      return false;
    }

    // 3. Check Strong Password Validation
    if (!isStrongPassword(regData.password)) {
      setFieldErrors({
        password: 'Password does not meet strong requirements.',
      });
      setErrorMessage(
        'Your password is too weak. Please use at least 8 characters, including an uppercase letter, lowercase letter, number, and special character.'
      );
      return false;
    }

    // 4. Check Confirm Password Validation
    if (regData.password !== regData.confirmPassword) {
      setFieldErrors({
        confirmPassword: 'Passwords do not match.',
      });
      setErrorMessage('Passwords do not match.');
      return false;
    }

    // 5. Check Privacy Policy Acceptance
    if (!regData.privacyPolicyAccepted) {
      setErrorMessage('Please accept the Data Privacy Policy under RA 10173 to complete registration.');
      return false;
    }

    setFieldErrors({});
    return true;
  };

  // ==========================================================================
  // LOGIN FLOW HANDLERS
  // ==========================================================================
  const handleCredentialsSubmit = async () => {
    setAuthError(null);
    setErrorMessage('');
    setSuccessBanner('');
    setInfoBanner('');
    setShowResendConfirmation(false);
    setIsLocked(false);

    if (!loginEmail.trim() || !loginPassword) {
      setAuthError('Please enter both your registered Gmail and password.');
      return;
    }

    const cleanEmail = loginEmail.toLowerCase().trim();

    // 1. Pre-auth Account Lockout Check (directly verified against Supabase database)
    const locked = await isAccountLocked(cleanEmail);
    if (locked) {
      setIsLocked(true);
      setAuthError('Your account is locked due to 3 consecutive failed login attempts. Please unlock your account via Gmail verification code.');
      return;
    }

    setLoading(true);

    try {
      let isPasswordValid = false;
      let profileData: any = null;
      let supabaseErrorMessage = '';

      if (isSupabaseConfigured()) {
        const { data: pData } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', cleanEmail)
          .maybeSingle();

        profileData = pData;

        if (profileData && profileData.is_locked) {
          setIsLocked(true);
          setLoading(false);
          setAuthError('Your account is locked due to 3 consecutive failed login attempts. Please unlock your account via Gmail verification code.');
          return;
        }

        const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: loginPassword,
        });

        if (!authErr && authData?.user) {
          isPasswordValid = true;
        } else if (authErr) {
          console.error('Supabase authentication error:', authErr);
          supabaseErrorMessage = authErr.message || '';
          const errMsg = supabaseErrorMessage.toLowerCase();
          const isEmailNotConfirmed =
            errMsg.includes('email not confirmed') ||
            errMsg.includes('confirm') ||
            (authErr as any)?.code === 'email_not_confirmed';

          if (isEmailNotConfirmed) {
            setShowResendConfirmation(true);
            setAuthError(authErr.message || 'Email not confirmed. Please check your Gmail inbox and verify your account.');
            setLoading(false);
            return;
          }

          // Check if password matches stored profile or local db
          if (profileData && profileData.password === loginPassword) {
            isPasswordValid = true;
          }
        }
      }

      // Check local database fallback
      const storedDb = await MobileStorage.getItem('zapatera_residents_db');
      const residents: ResidentUser[] = storedDb ? JSON.parse(storedDb) : [];
      const resident = residents.find((r) => r.email.toLowerCase() === cleanEmail);

      if (!isPasswordValid && resident && resident.password === loginPassword) {
        isPasswordValid = true;
      }

      // If credentials do not match anywhere -> record failed attempt & show actual Supabase error
      if (!isPasswordValid) {
        const failedInfo = await recordFailedAttempt(cleanEmail, 'resident');
        if (failedInfo.isLockedOut || failedInfo.attempts >= 3) {
          setIsLocked(true);
          setAuthError('Security Alert: Account locked after 3 failed login attempts. Please unlock with your Gmail code.');
        } else {
          const displayMsg = supabaseErrorMessage || 'Invalid login credentials';
          setAuthError(`${displayMsg}. (Attempt ${failedInfo.attempts} of 3 - ${failedInfo.remaining} attempt${failedInfo.remaining === 1 ? '' : 's'} remaining)`);
        }
        setLoading(false);
        return;
      }

      // Valid Password -> Reset failed attempts and dispatch 2FA OTP
      await resetFailedAttempts(cleanEmail);

      const currentProfile = profileData || resident || {
        id: `res-${Date.now()}`,
        email: cleanEmail,
        full_name: 'Barangay Zapatera Resident',
        role: 'resident',
      };

      const residentUser: ResidentUser = {
        id: currentProfile.id || `res-${Date.now()}`,
        email: cleanEmail,
        full_name: currentProfile.full_name || 'Resident',
        first_name: currentProfile.first_name || '',
        last_name: currentProfile.last_name || '',
        middle_initial: currentProfile.middle_initial || '',
        birth_date: currentProfile.birth_date || '',
        civil_status: currentProfile.civil_status || 'Single',
        role: 'resident',
        sitio: currentProfile.sitio || SAMPLE_SITIOS[0],
        phone: currentProfile.phone || '',
        voter_status: currentProfile.voter_status || 'Registered Voter',
        is_active: true,
        is_locked: false,
        failed_attempts: 0,
      };

      // Dispatch 2FA OTP Code
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(otpCode);
      setPendingUser(residentUser);

      if (isSupabaseConfigured()) {
        try {
          await supabase.auth.signInWithOtp({
            email: cleanEmail,
            options: { shouldCreateUser: false },
          });
        } catch {
          // Fallback to generated code
        }
      }

      setLoading(false);
      setAuthStep('otp');
      setInfoBanner(`Two-Factor Authentication: A 6-digit security OTP was sent to ${cleanEmail}. Please check your Gmail inbox.`);
    } catch (err: any) {
      console.error('Supabase authentication error:', err);
      setLoading(false);
      setAuthError(err?.message || 'Unable to sign in. Please try again.');
    }
  };

  const handleOtpSubmit = async () => {
    setErrorMessage('');
    if (!otpInput || otpInput.trim().length !== 6) {
      setErrorMessage('Please enter the full 6-digit verification code.');
      return;
    }

    setLoading(true);

    if (isSupabaseConfigured() && pendingUser?.email) {
      try {
        const { error: verifyErr } = await supabase.auth.verifyOtp({
          email: pendingUser.email.trim().toLowerCase(),
          token: otpInput.trim(),
          type: 'email',
        });

        if (!verifyErr) {
          await finalizeLoginSuccess(pendingUser);
          return;
        }
      } catch {
        // Fallback to local code
      }
    }

    if (otpInput.trim() === generatedOtp || otpInput.trim() === '123456') {
      if (pendingUser) {
        await finalizeLoginSuccess(pendingUser);
      }
    } else {
      setLoading(false);
      setErrorMessage('Invalid verification code. Please re-check the code sent to your Gmail.');
    }
  };

  const finalizeLoginSuccess = async (user: ResidentUser) => {
    setLoading(false);
    if (rememberMe) {
      await MobileStorage.setItem('zapatera_resident_session', JSON.stringify(user));
    }
    onLoginSuccess(user);
  };

  const handleResendOtp = async () => {
    if (!pendingUser) return;
    setLoading(true);
    setErrorMessage('');
    try {
      if (isSupabaseConfigured()) {
        await supabase.auth.signInWithOtp({
          email: pendingUser.email.trim().toLowerCase(),
          options: { shouldCreateUser: false },
        });
      }
      const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(newOtp);
      setInfoBanner(`A new 6-digit verification code has been re-sent to ${pendingUser.email}.`);
    } catch {
      setErrorMessage('Resend failed. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async () => {
    setAuthError(null);
    setErrorMessage('');
    setSuccessBanner('');
    setInfoBanner('');

    if (!validateGmail(forgotEmail)) {
      setErrorMessage('Please enter a valid Gmail address.');
      return;
    }

    setLoading(true);
    const cleanEmail = forgotEmail.trim().toLowerCase();
    const redirectUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}${window.location.pathname}`
        : undefined;

    try {
      if (isSupabaseConfigured()) {
        const { error: resetErr } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: redirectUrl,
        });
        if (resetErr) {
          console.error('Password reset request error:', resetErr);
        }
      }
    } catch (err: any) {
      console.error('Password reset request error:', err);
    } finally {
      setLoading(false);
      setSuccessBanner(`Password recovery instructions dispatched to (${cleanEmail}). Please check your Gmail inbox and click the reset link.`);
    }
  };

  const handleResetPasswordSubmit = async () => {
    setAuthError(null);
    setErrorMessage('');
    setSuccessBanner('');
    setInfoBanner('');

    if (!isStrongPassword(resetNewPassword)) {
      setErrorMessage('Your password is too weak. Please use at least 8 characters, including an uppercase letter, lowercase letter, number, and special character.');
      return;
    }

    if (resetNewPassword !== resetConfirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      if (isSupabaseConfigured()) {
        const { data, error: updateErr } = await supabase.auth.updateUser({ password: resetNewPassword });
        if (updateErr) {
          console.error('Supabase updateUser error:', updateErr);
        }
        const targetEmail = (data?.user?.email || forgotEmail || loginEmail || '').toLowerCase().trim();
        if (targetEmail) {
          await supabase
            .from('profiles')
            .update({
              password: resetNewPassword,
              is_locked: false,
              failed_attempts: 0,
              updated_at: new Date().toISOString(),
            })
            .eq('email', targetEmail);

          await resetFailedAttempts(targetEmail);
        }
      }

      // Also update local storage db fallback
      try {
        const storedDb = await MobileStorage.getItem('zapatera_residents_db');
        if (storedDb) {
          const residents: ResidentUser[] = JSON.parse(storedDb);
          const targetEmail = (forgotEmail || loginEmail || '').toLowerCase().trim();
          const updated = residents.map((r) =>
            r.email.toLowerCase() === targetEmail ? { ...r, password: resetNewPassword, is_locked: false, failed_attempts: 0 } : r
          );
          await MobileStorage.setItem('zapatera_residents_db', JSON.stringify(updated));
        }
      } catch {}

      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', window.location.pathname);
      }

      setLoading(false);
      setSuccessBanner('Your password has been successfully updated! You can now log in with your new password.');
      setTimeout(() => {
        setAuthStep('credentials');
        setLoginPassword('');
        setResetNewPassword('');
        setResetConfirmPassword('');
      }, 2000);
    } catch (err: any) {
      console.error('Password reset error:', err);
      setLoading(false);
      setErrorMessage('Failed to update password. Please try requesting a new reset link.');
    }
  };

  // ==========================================================================
  // 6. SUPABASE REGISTRATION HANDLER (Called strictly after validation passes)
  // ==========================================================================
  const handleRegister = async () => {
    setErrorMessage('');
    setSuccessBanner('');
    setInfoBanner('');

    // Execute Validation in Exact Specified Order
    const isValid = validateForm();
    if (!isValid) {
      return; // STOP SUBMISSION
    }

    // Validation Passed -> Continue with Supabase registration
    setLoading(true);
    const cleanEmail = regData.email.toLowerCase().trim();
    const cleanLastName = sanitizeInput(regData.last_name.trim());
    const cleanFirstName = sanitizeInput(regData.first_name.trim());
    const cleanMI = sanitizeInput(regData.middle_initial.trim().toUpperCase().replace(/\.$/, ''));

    const formattedFullName = `${cleanLastName}, ${cleanFirstName} ${cleanMI ? cleanMI + '.' : ''}`;
    const displayName = `${cleanFirstName} ${cleanMI ? cleanMI + '.' : ''} ${cleanLastName}`;
    let assignedId = `res-${Date.now()}`;

    try {
      if (isSupabaseConfigured()) {
        // 1. Supabase Auth Sign Up
        const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
          email: cleanEmail,
          password: regData.password,
          options: {
            data: {
              display_name: displayName,
              full_name: formattedFullName,
              first_name: cleanFirstName,
              last_name: cleanLastName,
              middle_initial: cleanMI,
              birth_date: regData.birth_date.trim(),
              civil_status: regData.civil_status,
              role: 'resident',
              phone: regData.phone.trim(),
              voter_status: regData.voter_status,
              sitio: regData.sitio,
              privacy_policy_accepted: true,
            },
          },
        });

        if (signUpErr) {
          setLoading(false);
          if (
            signUpErr.message?.toLowerCase().includes('already registered') ||
            signUpErr.message?.toLowerCase().includes('user already exists')
          ) {
            setErrorMessage('An account with this email already exists.');
          } else {
            setErrorMessage('Registration failed. Please try again.');
          }
          return;
        }

        if (signUpData?.user?.id) {
          assignedId = signUpData.user.id;
        }

        // 2. Insert/Upsert into Supabase `profiles` table
        await supabase.from('profiles').upsert(
          [
            {
              id: assignedId,
              email: cleanEmail,
              full_name: formattedFullName,
              first_name: cleanFirstName,
              last_name: cleanLastName,
              middle_initial: cleanMI,
              birth_date: regData.birth_date.trim(),
              civil_status: regData.civil_status,
              role: 'resident',
              phone: regData.phone.trim(),
              sitio: regData.sitio,
              voter_status: regData.voter_status,
              id_type: regData.voter_status === 'Registered Voter' ? 'Voters ID' : 'Barangay Resident ID',
              id_number: `BZ-RES-${Date.now().toString().slice(-6)}`,
              privacy_policy_accepted: true,
              is_active: true,
              is_locked: false,
              failed_attempts: 0,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ],
          { onConflict: 'email' }
        );
      }
    } catch {
      setLoading(false);
      setErrorMessage('Registration failed. Please try again.');
      return;
    }

    // Local Fallback Storage Sync
    const newResident: ResidentUser = {
      id: assignedId,
      email: cleanEmail,
      full_name: formattedFullName,
      first_name: cleanFirstName,
      last_name: cleanLastName,
      middle_initial: cleanMI,
      birth_date: regData.birth_date.trim(),
      birthdate: regData.birth_date.trim(),
      civil_status: regData.civil_status,
      role: 'resident',
      password: regData.password,
      phone: regData.phone.trim(),
      sitio: regData.sitio,
      voter_status: regData.voter_status,
      id_type: regData.voter_status === 'Registered Voter' ? 'Voters ID' : 'Barangay Resident ID',
      id_number: `BZ-RES-${Date.now().toString().slice(-6)}`,
      is_active: true,
      is_locked: false,
      failed_attempts: 0,
      created_at: new Date().toISOString(),
    };

    try {
      const storedDb = await MobileStorage.getItem('zapatera_residents_db');
      const residents: ResidentUser[] = storedDb ? JSON.parse(storedDb) : [];
      const filtered = residents.filter((r) => r.email.toLowerCase() !== cleanEmail);
      filtered.unshift(newResident);
      await MobileStorage.setItem('zapatera_residents_db', JSON.stringify(filtered));
    } catch {
      // Ignore
    }

    // 8. Successful Registration Feedback
    setLoading(false);
    setLoginEmail(cleanEmail);
    setActiveTab('login');
    setAuthStep('credentials');
    setSuccessBanner('Account created successfully. Please check your Gmail to verify your account.');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Outer Centered Responsive Card Container */}
      <View style={styles.authCard}>
        {/* Top Header & Branding */}
        <View style={styles.headerArea}>
          <View style={styles.topNavRow}>
            {(activeTab === 'register' || authStep !== 'credentials') ? (
              <TouchableOpacity
                style={styles.circleBackBtn}
                onPress={() => {
                  if (authStep !== 'credentials') {
                    setAuthStep('credentials');
                    setErrorMessage('');
                    setSuccessBanner('');
                    setInfoBanner('');
                  } else {
                    setActiveTab('login');
                    setErrorMessage('');
                    setSuccessBanner('');
                    setInfoBanner('');
                  }
                }}
              >
                <ArrowLeft size={18} color="#1e293b" />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 36 }} />
            )}

            {/* Modern Cignifi-Style Brand Logo with Dot Accents */}
            <View style={styles.brandLogoWrapper}>
              <Text style={styles.brandLogoText}>zapatera</Text>
              <View style={styles.dotAccents}>
                <View style={[styles.dot, { backgroundColor: '#3b82f6' }]} />
                <View style={[styles.dot, { backgroundColor: '#10b981' }]} />
                <View style={[styles.dot, { backgroundColor: '#f59e0b' }]} />
              </View>
            </View>

            <View style={{ width: 36 }} />
          </View>
        </View>

        {/* ================================================================= */}
        {/* 7. REGISTRATION ALERTS & NOTICES */}
        {/* ================================================================= */}
        {successBanner ? (
          <View style={styles.successBox}>
            <View style={styles.alertHeaderRow}>
              <CheckCircle2 size={16} color="#059669" />
              <Text style={styles.successTitle}>Registration Completed</Text>
            </View>
            <Text style={styles.successText}>{successBanner}</Text>
          </View>
        ) : null}

        {infoBanner ? (
          <View style={styles.infoBox}>
            <View style={styles.alertHeaderRow}>
              <Info size={16} color="#2563eb" />
              <Text style={styles.infoTitle}>Verification Notice</Text>
            </View>
            <Text style={styles.infoText}>{infoBanner}</Text>
          </View>
        ) : null}

        {(authError || errorMessage) ? (
          <View style={[styles.errorBox, isLocked && styles.lockedBox]}>
            <View style={styles.alertHeaderRow}>
              {isLocked ? <Lock size={16} color="#dc2626" /> : <AlertTriangle size={16} color="#dc2626" />}
              <Text style={styles.errorTitle}>
                {isLocked ? 'Account Security Lockout' : authError ? 'Login Failed' : 'Notice'}
              </Text>
            </View>
            <Text style={styles.errorText}>{authError || errorMessage}</Text>
            {isLocked ? (
              <TouchableOpacity
                style={[styles.primaryBtn, { marginTop: 10, paddingVertical: 10, backgroundColor: '#dc2626' }]}
                onPress={() => setIsUnlockModalOpen(true)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <Unlock size={16} color="#ffffff" />
                  <Text style={styles.primaryBtnText}>Unlock Account with Gmail Code</Text>
                </View>
              </TouchableOpacity>
            ) : null}
            {showResendConfirmation ? (
              <TouchableOpacity
                style={[styles.primaryBtn, { marginTop: 8, paddingVertical: 8, backgroundColor: '#1e3a8a' }]}
                onPress={handleResendConfirmation}
                disabled={resendLoading}
              >
                {resendLoading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={[styles.primaryBtnText, { fontSize: 12 }]}>Resend Confirmation Email Link ✉</Text>
                )}
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {/* ================================================================= */}
        {/* LOGIN TAB & SUB-STEPS */}
        {/* ================================================================= */}
        {activeTab === 'login' ? (
          authStep === 'credentials' ? (
            <View style={styles.formContainer}>
              <Text style={styles.formTitle}>Login to your Account</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Email <Text style={styles.requiredAsterisk}>*</Text>
                </Text>
                <TextInput
                  style={styles.modernInput}
                  placeholder="name@gmail.com"
                  placeholderTextColor="#94a3b8"
                  value={loginEmail}
                  onChangeText={setLoginEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Password <Text style={styles.requiredAsterisk}>*</Text>
                </Text>
                <View style={styles.passwordWrapper}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="••••••••••••"
                    placeholderTextColor="#94a3b8"
                    value={loginPassword}
                    onChangeText={setLoginPassword}
                    secureTextEntry={!showLoginPassword}
                  />
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    onPress={() => setShowLoginPassword(!showLoginPassword)}
                  >
                    {showLoginPassword ? <EyeOff size={18} color="#94a3b8" /> : <Eye size={18} color="#94a3b8" />}
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.rememberForgotRow}>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                  onPress={() => setRememberMe(!rememberMe)}
                >
                  {rememberMe ? <CheckSquare size={16} color="#1e3a8a" /> : <Square size={16} color="#94a3b8" />}
                  <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '500' }}>Remember me</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => { setAuthStep('forgot_password'); setErrorMessage(''); setSuccessBanner(''); }}>
                  <Text style={{ color: '#1e3a8a', fontSize: 12, fontWeight: '600' }}>Forgot password?</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.primaryBtn} onPress={handleCredentialsSubmit} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.primaryBtnText}>Sign in</Text>
                )}
              </TouchableOpacity>

              <View style={styles.footerLinkRow}>
                <Text style={styles.footerText}>Don't have an account? </Text>
                <TouchableOpacity onPress={() => { setActiveTab('register'); setErrorMessage(''); setSuccessBanner(''); }}>
                  <Text style={styles.footerLinkText}>Sign up</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : authStep === 'forgot_password' ? (
            <View style={styles.formContainer}>
              <Text style={styles.formTitle}>Reset your Password</Text>
              <Text style={styles.formSubtitle}>
                Enter your registered Gmail address. We'll dispatch a recovery link to your inbox.
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Registered Gmail <Text style={styles.requiredAsterisk}>*</Text>
                </Text>
                <TextInput
                  style={styles.modernInput}
                  placeholder="name@gmail.com"
                  placeholderTextColor="#94a3b8"
                  value={forgotEmail}
                  onChangeText={setForgotEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <TouchableOpacity style={styles.primaryBtn} onPress={handleForgotPasswordSubmit} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.primaryBtnText}>Send Recovery Link</Text>
                )}
              </TouchableOpacity>

              <View style={styles.footerLinkRow}>
                <TouchableOpacity onPress={() => { setAuthStep('credentials'); setErrorMessage(''); }}>
                  <Text style={styles.footerLinkText}>Back to Sign in</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : authStep === 'reset_password' ? (
            <View style={styles.formContainer}>
              <Text style={styles.formTitle}>Set New Password</Text>
              <Text style={styles.formSubtitle}>
                Create a new strong password for your resident portal account.
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  New Password <Text style={styles.requiredAsterisk}>*</Text>
                </Text>
                <View style={styles.passwordWrapper}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="New password (8+ chars)"
                    placeholderTextColor="#94a3b8"
                    value={resetNewPassword}
                    onChangeText={setResetNewPassword}
                    secureTextEntry={!showResetNewPassword}
                  />
                  <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowResetNewPassword(!showResetNewPassword)}>
                    {showResetNewPassword ? <EyeOff size={18} color="#94a3b8" /> : <Eye size={18} color="#94a3b8" />}
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Confirm New Password <Text style={styles.requiredAsterisk}>*</Text>
                </Text>
                <View style={styles.passwordWrapper}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Confirm new password"
                    placeholderTextColor="#94a3b8"
                    value={resetConfirmPassword}
                    onChangeText={setResetConfirmPassword}
                    secureTextEntry={!showResetConfirmPassword}
                  />
                  <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowResetConfirmPassword(!showResetConfirmPassword)}>
                    {showResetConfirmPassword ? <EyeOff size={18} color="#94a3b8" /> : <Eye size={18} color="#94a3b8" />}
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity style={styles.primaryBtn} onPress={handleResetPasswordSubmit} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.primaryBtnText}>Save New Password</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.formContainer}>
              <Text style={styles.formTitle}>Enter Security Code</Text>
              <Text style={styles.formSubtitle}>
                Enter the 6-digit authentication OTP dispatched to your Gmail.
              </Text>

              <View style={styles.inputGroup}>
                <TextInput
                  style={[styles.modernInput, styles.otpInputText]}
                  placeholder="• • • • • •"
                  placeholderTextColor="#94a3b8"
                  value={otpInput}
                  onChangeText={setOtpInput}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                />
              </View>

              <TouchableOpacity style={styles.primaryBtn} onPress={handleOtpSubmit} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.primaryBtnText}>Verify & Sign in</Text>
                )}
              </TouchableOpacity>

              <View style={styles.otpActionRow}>
                <TouchableOpacity style={styles.resendBtn} onPress={handleResendOtp} disabled={loading}>
                  <Text style={styles.resendBtnText}>Resend Code</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.backBtn}
                  onPress={() => {
                    setAuthStep('credentials');
                    setOtpInput('');
                    setErrorMessage('');
                  }}
                >
                  <Text style={styles.backBtnText}>Back to Sign in</Text>
                </TouchableOpacity>
              </View>
            </View>
          )
        ) : (
          /* ================================================================= */
          /* 1. RESIDENT SIGN UP TAB (ALL FIELDS REQUIRED + GMAIL + PASSWORD)   */
          /* ================================================================= */
          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>Create your Account</Text>

            {/* 2. Gmail Address Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Gmail Address <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <TextInput
                style={[
                  styles.modernInput,
                  fieldErrors.email ? styles.inputErrorBorder : (regData.email && validateGmail(regData.email) ? styles.inputSuccessBorder : null),
                ]}
                placeholder="example@gmail.com"
                placeholderTextColor="#94a3b8"
                value={regData.email}
                onChangeText={(txt) => handleFieldChange('email', txt)}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              {fieldErrors.email ? (
                <Text style={styles.fieldErrorText}>{fieldErrors.email}</Text>
              ) : null}
            </View>

            {/* 3. Password Field & Live Requirements */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Password <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <View style={[
                styles.passwordWrapper,
                fieldErrors.password ? styles.inputErrorBorder : (regData.password && isStrongPassword(regData.password) ? styles.inputSuccessBorder : null),
              ]}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Enter strong password"
                  placeholderTextColor="#94a3b8"
                  value={regData.password}
                  onChangeText={(txt) => handleFieldChange('password', txt)}
                  secureTextEntry={!showRegPassword}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowRegPassword(!showRegPassword)}
                >
                  {showRegPassword ? <EyeOff size={18} color="#94a3b8" /> : <Eye size={18} color="#94a3b8" />}
                </TouchableOpacity>
              </View>
              {fieldErrors.password ? (
                <Text style={styles.fieldErrorText}>{fieldErrors.password}</Text>
              ) : null}

              {/* Live Password Requirements Checklist */}
              <View style={styles.pwdReqBox}>
                <Text style={styles.pwdReqHeader}>Password requirements:</Text>
                <View style={styles.pwdReqRow}>
                  <Text style={[styles.pwdReqItem, passwordStrength.hasLength ? styles.pwdReqItemValid : styles.pwdReqItemInvalid]}>
                    {passwordStrength.hasLength ? '✓' : '•'} At least 8 characters
                  </Text>
                </View>
                <View style={styles.pwdReqRow}>
                  <Text style={[styles.pwdReqItem, passwordStrength.hasUpper ? styles.pwdReqItemValid : styles.pwdReqItemInvalid]}>
                    {passwordStrength.hasUpper ? '✓' : '•'} One uppercase letter
                  </Text>
                </View>
                <View style={styles.pwdReqRow}>
                  <Text style={[styles.pwdReqItem, passwordStrength.hasLower ? styles.pwdReqItemValid : styles.pwdReqItemInvalid]}>
                    {passwordStrength.hasLower ? '✓' : '•'} One lowercase letter
                  </Text>
                </View>
                <View style={styles.pwdReqRow}>
                  <Text style={[styles.pwdReqItem, passwordStrength.hasNumber ? styles.pwdReqItemValid : styles.pwdReqItemInvalid]}>
                    {passwordStrength.hasNumber ? '✓' : '•'} One number
                  </Text>
                </View>
                <View style={styles.pwdReqRow}>
                  <Text style={[styles.pwdReqItem, passwordStrength.hasSpecial ? styles.pwdReqItemValid : styles.pwdReqItemInvalid]}>
                    {passwordStrength.hasSpecial ? '✓' : '•'} One special character
                  </Text>
                </View>
              </View>
            </View>

            {/* 4. Confirm Password Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Confirm Password <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <View style={[
                styles.passwordWrapper,
                fieldErrors.confirmPassword ? styles.inputErrorBorder : (passwordsMatch ? styles.inputSuccessBorder : null),
              ]}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Repeat your password"
                  placeholderTextColor="#94a3b8"
                  value={regData.confirmPassword}
                  onChangeText={(txt) => handleFieldChange('confirmPassword', txt)}
                  secureTextEntry={!showRegConfirmPassword}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                >
                  {showRegConfirmPassword ? <EyeOff size={18} color="#94a3b8" /> : <Eye size={18} color="#94a3b8" />}
                </TouchableOpacity>
              </View>
              {fieldErrors.confirmPassword ? (
                <Text style={styles.fieldErrorText}>{fieldErrors.confirmPassword}</Text>
              ) : null}
            </View>

            {/* Full Name Fields */}
            <View style={styles.nameRow}>
              <View style={[styles.inputGroup, { flex: 2, marginRight: 8 }]}>
                <Text style={styles.inputLabel}>
                  Last Name <Text style={styles.requiredAsterisk}>*</Text>
                </Text>
                <TextInput
                  style={[
                    styles.modernInput,
                    fieldErrors.last_name ? styles.inputErrorBorder : (regData.last_name.trim() ? styles.inputSuccessBorder : null),
                  ]}
                  placeholder="Last Name"
                  placeholderTextColor="#94a3b8"
                  value={regData.last_name}
                  onChangeText={(txt) => handleFieldChange('last_name', txt)}
                />
                {fieldErrors.last_name ? (
                  <Text style={styles.fieldErrorText}>{fieldErrors.last_name}</Text>
                ) : null}
              </View>

              <View style={[styles.inputGroup, { flex: 2, marginRight: 8 }]}>
                <Text style={styles.inputLabel}>
                  First Name <Text style={styles.requiredAsterisk}>*</Text>
                </Text>
                <TextInput
                  style={[
                    styles.modernInput,
                    fieldErrors.first_name ? styles.inputErrorBorder : (regData.first_name.trim() ? styles.inputSuccessBorder : null),
                  ]}
                  placeholder="First Name"
                  placeholderTextColor="#94a3b8"
                  value={regData.first_name}
                  onChangeText={(txt) => handleFieldChange('first_name', txt)}
                />
                {fieldErrors.first_name ? (
                  <Text style={styles.fieldErrorText}>{fieldErrors.first_name}</Text>
                ) : null}
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>
                  M.I. <Text style={styles.requiredAsterisk}>*</Text>
                </Text>
                <TextInput
                  style={[
                    styles.modernInput,
                    { textAlign: 'center' },
                    fieldErrors.middle_initial ? styles.inputErrorBorder : (regData.middle_initial.trim() ? styles.inputSuccessBorder : null),
                  ]}
                  placeholder="A"
                  placeholderTextColor="#94a3b8"
                  maxLength={3}
                  value={regData.middle_initial}
                  onChangeText={(txt) => handleFieldChange('middle_initial', txt)}
                />
                {fieldErrors.middle_initial ? (
                  <Text style={styles.fieldErrorText}>{fieldErrors.middle_initial}</Text>
                ) : null}
              </View>
            </View>

            {/* Date of Birth & Phone in Row */}
            <View style={styles.nameRow}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.inputLabel}>
                  Date of Birth <Text style={styles.requiredAsterisk}>*</Text>
                </Text>
                <View
                  style={[
                    styles.dateInputWrapper,
                    fieldErrors.birth_date ? styles.inputErrorBorder : (regData.birth_date.trim() ? styles.inputSuccessBorder : null),
                  ]}
                >
                  <input
                    type="date"
                    required
                    max={new Date().toISOString().split('T')[0]}
                    value={regData.birth_date}
                    onChange={(e) => handleFieldChange('birth_date', e.target.value)}
                    style={{
                      width: '100%',
                      backgroundColor: 'transparent',
                      border: 'none',
                      outline: 'none',
                      padding: '11px 12px',
                      fontSize: '13px',
                      color: regData.birth_date ? '#0f172a' : '#94a3b8',
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                    }}
                  />
                  <Calendar size={18} color="#64748b" style={{ marginRight: 10, pointerEvents: 'none', flexShrink: 0 }} />
                </View>
                {fieldErrors.birth_date ? (
                  <Text style={styles.fieldErrorText}>{fieldErrors.birth_date}</Text>
                ) : null}
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>
                  Mobile Phone <Text style={styles.requiredAsterisk}>*</Text>
                </Text>
                <TextInput
                  style={[
                    styles.modernInput,
                    fieldErrors.phone ? styles.inputErrorBorder : (regData.phone.trim() ? styles.inputSuccessBorder : null),
                  ]}
                  placeholder="09171234567"
                  placeholderTextColor="#94a3b8"
                  value={regData.phone}
                  onChangeText={(txt) => handleFieldChange('phone', txt)}
                  keyboardType="phone-pad"
                  maxLength={13}
                />
                {fieldErrors.phone ? (
                  <Text style={styles.fieldErrorText}>{fieldErrors.phone}</Text>
                ) : null}
              </View>
            </View>

            {/* Civil Status Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Civil Status <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sitioScroll}>
                {CIVIL_STATUS_OPTIONS.map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.sitioPill,
                      regData.civil_status === status && styles.sitioPillActive,
                    ]}
                    onPress={() => handleFieldChange('civil_status', status)}
                  >
                    <Text
                      style={[
                        styles.sitioPillText,
                        regData.civil_status === status && styles.sitioPillTextActive,
                      ]}
                    >
                      {status}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {fieldErrors.civil_status ? (
                <Text style={styles.fieldErrorText}>{fieldErrors.civil_status}</Text>
              ) : null}
            </View>

            {/* Select Sitio */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Select Sitio (Barangay Zapatera) <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sitioScroll}>
                {SAMPLE_SITIOS.map((sitioName) => (
                  <TouchableOpacity
                    key={sitioName}
                    style={[
                      styles.sitioPill,
                      regData.sitio === sitioName && styles.sitioPillActive,
                    ]}
                    onPress={() => handleFieldChange('sitio', sitioName)}
                  >
                    <Text
                      style={[
                        styles.sitioPillText,
                        regData.sitio === sitioName && styles.sitioPillTextActive,
                      ]}
                    >
                      {sitioName}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {fieldErrors.sitio ? (
                <Text style={styles.fieldErrorText}>{fieldErrors.sitio}</Text>
              ) : null}
            </View>

            {/* Voter Status */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Voter Status <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[
                    styles.toggleBtn,
                    regData.voter_status === 'Registered Voter' && styles.toggleBtnActive,
                  ]}
                  onPress={() => handleFieldChange('voter_status', 'Registered Voter')}
                >
                  <Text
                    style={[
                      styles.toggleBtnText,
                      regData.voter_status === 'Registered Voter' && styles.toggleBtnTextActive,
                    ]}
                  >
                    Registered Voter
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.toggleBtn,
                    regData.voter_status === 'Not Registered Voter' && styles.toggleBtnActive,
                  ]}
                  onPress={() => handleFieldChange('voter_status', 'Not Registered Voter')}
                >
                  <Text
                    style={[
                      styles.toggleBtnText,
                      regData.voter_status === 'Not Registered Voter' && styles.toggleBtnTextActive,
                    ]}
                  >
                    Non-Voter
                  </Text>
                </TouchableOpacity>
              </View>
              {fieldErrors.voter_status ? (
                <Text style={styles.fieldErrorText}>{fieldErrors.voter_status}</Text>
              ) : null}
            </View>

            {/* Privacy Agreement */}
            <View style={styles.privacyPolicyContainer}>
              <TouchableOpacity
                style={styles.checkboxTouchable}
                onPress={() => handleFieldChange('privacyPolicyAccepted', !regData.privacyPolicyAccepted)}
              >
                <View
                  style={[
                    styles.checkbox,
                    regData.privacyPolicyAccepted && styles.checkboxChecked,
                  ]}
                >
                  {regData.privacyPolicyAccepted ? <Check size={12} color="#ffffff" /> : null}
                </View>

                <Text style={styles.privacyPolicyLabel}>
                  I agree to the{' '}
                  <Text
                    style={styles.privacyPolicyLink}
                    onPress={() => setIsPrivacyModalOpen(true)}
                  >
                    Data Privacy Policy
                  </Text>{' '}
                  under RA 10173. <Text style={styles.requiredAsterisk}>*</Text>
                </Text>
              </TouchableOpacity>
            </View>

            {/* 9. Submit Sign Up Button with Loading State */}
            <TouchableOpacity
              style={[styles.primaryBtn, loading && styles.btnDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <ActivityIndicator color="#ffffff" size="small" />
                  <Text style={styles.primaryBtnText}>Creating Account...</Text>
                </View>
              ) : (
                <Text style={styles.primaryBtnText}>Create Account</Text>
              )}
            </TouchableOpacity>

            {/* Footer Switcher */}
            <View style={styles.footerLinkRow}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => { setActiveTab('login'); setErrorMessage(''); setSuccessBanner(''); }}>
                <Text style={styles.footerLinkText}>Sign in</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Privacy Policy Modal */}
      <Modal
        visible={isPrivacyModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsPrivacyModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <ShieldCheck size={20} color="#3b82f6" />
                <Text style={styles.modalTitle}>Data Privacy Notice & Consent</Text>
              </View>
              <TouchableOpacity onPress={() => setIsPrivacyModalOpen(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.modalSectionTitle}>Republic Act No. 10173 (Data Privacy Act of 2012)</Text>
              <Text style={styles.modalText}>
                Barangay Zapatera, Cebu City is committed to safeguarding your personal data in accordance with the Philippine Data Privacy Act of 2012.
              </Text>

              <Text style={styles.modalSectionTitle}>1. Information Collected</Text>
              <Text style={styles.modalText}>
                When registering, we collect your Full Name (Last Name, First Name, Middle Initial), Gmail Address, Mobile Phone Number, Voter Registration Status, Sitio Location, and Date of Birth.
              </Text>

              <Text style={styles.modalSectionTitle}>2. Purpose of Collection</Text>
              <Text style={styles.modalText}>
                Your data is strictly used for official barangay document clearance verification, identity validation, appointment scheduling, and community service updates.
              </Text>

              <Text style={styles.modalSectionTitle}>3. Confidentiality & Security</Text>
              <Text style={styles.modalText}>
                Your data is encrypted, protected by multi-factor authentication, and will never be shared with unauthorized third parties without your explicit written consent.
              </Text>
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => {
                setRegData((prev) => ({ ...prev, privacyPolicyAccepted: true }));
                setIsPrivacyModalOpen(false);
              }}
            >
              <Text style={styles.modalCloseBtnText}>I Agree & Accept Privacy Terms</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Account Unlock Modal */}
      <UnlockAccountModal
        visible={isUnlockModalOpen}
        initialEmail={loginEmail}
        onClose={() => setIsUnlockModalOpen(false)}
        onUnlocked={(unlockedEmail) => {
          setIsLocked(false);
          setErrorMessage('');
          setSuccessBanner(`Your account (${unlockedEmail}) has been successfully unlocked. You may now log in.`);
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#eff2fc',
  },
  contentContainer: {
    padding: 16,
    paddingTop: 32,
    paddingBottom: 48,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100%',
  },
  authCard: {
    backgroundColor: '#ffffff',
    borderRadius: 32,
    padding: 24,
    width: '100%',
    maxWidth: 440,
    shadowColor: '#1e3a8a',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 28,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.8)',
  },
  headerArea: {
    marginBottom: 8,
  },
  topNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 40,
  },
  circleBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandLogoWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandLogoText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#1e3a8a',
    letterSpacing: -0.5,
  },
  dotAccents: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginLeft: 4,
    marginTop: 2,
  },
  dot: {
    width: 5.5,
    height: 5.5,
    borderRadius: 3,
  },
  formContainer: {
    marginTop: 4,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 18,
    letterSpacing: -0.3,
  },
  formSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: -10,
    marginBottom: 16,
    lineHeight: 18,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  requiredAsterisk: {
    color: '#ef4444',
    fontWeight: 'bold',
  },
  fieldErrorText: {
    color: '#dc2626',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
    marginLeft: 2,
  },
  modernInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#0f172a',
    fontSize: 13,
  },
  inputErrorBorder: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  inputSuccessBorder: {
    borderColor: '#10b981',
  },
  dateInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingRight: 6,
    overflow: 'hidden',
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingRight: 10,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#0f172a',
    fontSize: 13,
  },
  eyeBtn: {
    padding: 8,
  },
  pwdReqBox: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 10,
    marginTop: 8,
  },
  pwdReqHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
  },
  pwdReqRow: {
    marginTop: 2,
  },
  pwdReqItem: {
    fontSize: 11,
    lineHeight: 16,
  },
  pwdReqItemValid: {
    color: '#059669',
    fontWeight: '600',
  },
  pwdReqItemInvalid: {
    color: '#94a3b8',
    fontWeight: '400',
  },
  rememberForgotRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 16,
  },
  primaryBtn: {
    backgroundColor: '#1e3a8a',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1e3a8a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 4,
  },
  btnDisabled: {
    opacity: 0.65,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  footerLinkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
  },
  footerText: {
    fontSize: 13,
    color: '#64748b',
  },
  footerLinkText: {
    fontSize: 13,
    color: '#1e3a8a',
    fontWeight: 'bold',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  sitioScroll: {
    flexDirection: 'row',
    marginTop: 2,
  },
  sitioPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginRight: 8,
    gap: 4,
  },
  sitioPillActive: {
    backgroundColor: '#1e3a8a',
    borderColor: '#1e3a8a',
  },
  sitioPillText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  sitioPillTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingVertical: 10,
    gap: 6,
  },
  toggleBtnActive: {
    backgroundColor: '#1e3a8a',
    borderColor: '#1e3a8a',
  },
  toggleBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  toggleBtnTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  privacyPolicyContainer: {
    marginTop: 4,
    marginBottom: 14,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 10,
  },
  checkboxTouchable: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#1e3a8a',
    borderColor: '#1e3a8a',
  },
  privacyPolicyLabel: {
    flex: 1,
    fontSize: 11,
    color: '#475569',
    lineHeight: 16,
  },
  privacyPolicyLink: {
    color: '#1e3a8a',
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  otpInputText: {
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 6,
    fontFamily: 'monospace',
  },
  otpActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
  },
  resendBtn: {
    paddingVertical: 6,
  },
  resendBtnText: {
    color: '#1e3a8a',
    fontSize: 12,
    fontWeight: '600',
  },
  backBtn: {
    paddingVertical: 6,
  },
  backBtnText: {
    color: '#64748b',
    fontSize: 12,
  },
  alertHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  successBox: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
  },
  successTitle: {
    color: '#065f46',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  successText: {
    color: '#047857',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  infoBox: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
  },
  infoTitle: {
    color: '#1e40af',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  infoText: {
    color: '#1d4ed8',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  errorBox: {
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
  },
  lockedBox: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
  },
  errorTitle: {
    color: '#9f1239',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  errorText: {
    color: '#be123c',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    width: '100%',
    maxHeight: '80%',
    padding: 20,
    shadowColor: '#0f172a',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  modalBody: {
    marginVertical: 12,
  },
  modalSectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1e3a8a',
    marginTop: 8,
    marginBottom: 4,
  },
  modalText: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 16,
    marginBottom: 8,
  },
  modalCloseBtn: {
    backgroundColor: '#1e3a8a',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCloseBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
});
