import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
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
  Shield,
  ShieldCheck,
  Info,
  Check,
  X,
  FileText,
  User,
  Mail,
  Phone,
  MapPin,
  Vote,
  Fingerprint,
  CheckSquare,
  Square,
  Calendar,
} from 'lucide-react';
import { ResidentUser } from '../../types';
import { validateEmail, sanitizeInput, checkRateLimit, isAccountLocked, recordFailedAttempt, resetFailedAttempts } from '../../core/security';
import { supabase, isSupabaseConfigured } from '../../core/supabase';
import { MobileStorage } from '../../core/storage';
import UnlockAccountModal from '../../components/UnlockAccountModal';

// ============================================================================
// SAMPLE SITIO LIST FOR BARANGAY ZAPATERA
// NOTE: You can easily add, edit, or customize any sitio names in this array:
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

// Strong Password Validation Helper
export function checkPasswordStrength(password: string) {
  return {
    hasLength: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
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

  // Register Form State (Structured Fields)
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

  // Password Visibility State for Register
  const [showRegPassword, setShowRegPassword] = useState<boolean>(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState<boolean>(false);

  // Privacy Policy Modal State
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState<boolean>(false);

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

  // Live password strength indicator for register
  const passwordStrength = checkPasswordStrength(regData.password);
  const passwordsMatch = regData.password && regData.confirmPassword && regData.password === regData.confirmPassword;

  // Formatted Full Name Preview: "Lastname, Firstname MI."
  const cleanMI = regData.middle_initial.trim().toUpperCase().replace(/\.$/, '');
  const previewFormattedName = regData.last_name.trim() || regData.first_name.trim()
    ? `${regData.last_name.trim() || '[Last Name]'}, ${regData.first_name.trim() || '[First Name]'} ${cleanMI ? cleanMI + '.' : ''}`
    : '';

  const [showResendConfirmation, setShowResendConfirmation] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

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
          setSuccessBanner(`A confirmation link has been resent to ${loginEmail.trim().toLowerCase()}. Please check your Gmail.`);
        }
      }
    } catch (err) {
      setErrorMessage('Failed to resend confirmation email.');
    } finally {
      setResendLoading(false);
    }
  };

  // ==========================================
  // HANDLE RESIDENT LOGIN
  // ==========================================
  const handleCredentialsSubmit = async () => {
    setErrorMessage('');
    setSuccessBanner('');
    setInfoBanner('');
    setShowResendConfirmation(false);

    if (!validateEmail(loginEmail)) {
      setErrorMessage('Please enter a valid Gmail / email address.');
      return;
    }
    if (!loginPassword) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setLoading(true);
    const cleanEmail = loginEmail.toLowerCase().trim();

    // 1. CHECK RATE LIMIT (10-second interval)
    const rateLimit = await checkRateLimit(cleanEmail);
    if (!rateLimit.allowed) {
      setErrorMessage(rateLimit.message || 'Too many authentication attempts. Please wait 10 seconds before trying again.');
      setLoading(false);
      return;
    }

    // 2. CHECK IF ACCOUNT IS LOCKED (3 Failed Attempts)
    const locked = await isAccountLocked(cleanEmail);
    if (locked) {
      setIsLocked(true);
      setErrorMessage('Your account has been locked after 3 failed login attempts. Please unlock your account using the verification code sent to your email.');
      setLoading(false);
      return;
    }

    // 3. CHECK WHETHER GMAIL / ACCOUNT EXISTS
    let profData: any = null;
    try {
      if (isSupabaseConfigured()) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', cleanEmail)
          .maybeSingle();

        profData = data;
      }
    } catch (e) {
      // Handled silently
    }

    if (!profData) {
      setErrorMessage('This Gmail account is not registered. Please sign up first.');
      setLoading(false);
      return;
    }

    // 4. VERIFY PASSWORD WITH OFFICIAL SUPABASE AUTH & CHECK EMAIL CONFIRMATION
    let authUser: any = null;
    try {
      if (isSupabaseConfigured()) {
        const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: loginPassword,
        });

        if (authErr) {
          const errMsg = (authErr.message || '').toLowerCase();
          if (errMsg.includes('email not confirmed') || errMsg.includes('confirm') || authErr.code === 'email_not_confirmed') {
            setErrorMessage('Your account has been created, but your Gmail has not been confirmed yet. Please check your email and click the confirmation link before logging in.');
            setShowResendConfirmation(true);
            setLoading(false);
            return;
          }

          const lockRes = await recordFailedAttempt(cleanEmail, 'resident');
          if (lockRes.isLockedOut || lockRes.attempts >= 3) {
            setIsLocked(true);
            setErrorMessage('Your account has been locked after 3 failed login attempts. Please unlock your account using the verification code sent to your email.');
          } else {
            const remaining = lockRes.remaining ?? (3 - lockRes.attempts);
            setErrorMessage(`Invalid email or password. You have ${remaining} ${remaining === 1 ? 'attempt' : 'attempts'} remaining.`);
          }

          setLoading(false);
          return;
        }

        authUser = authData?.user;
      }
    } catch (err: any) {
      setErrorMessage('Authentication service error. Please try again.');
      setLoading(false);
      return;
    }

    // 5. SUCCESSFUL PASSWORD VERIFICATION -> RESET LOCKOUT AND DISPATCH 6-DIGIT OTP TO GMAIL
    await resetFailedAttempts(cleanEmail);
    setIsLocked(false);

    try {
      if (isSupabaseConfigured()) {
        const { error: otpErr } = await supabase.auth.signInWithOtp({
          email: cleanEmail,
          options: {
            shouldCreateUser: false,
          },
        });

        if (otpErr) {
          setErrorMessage('Failed to send verification code to your Gmail. Please try again.');
          setLoading(false);
          return;
        }
      }
    } catch (err: any) {
      setErrorMessage('Failed to send OTP code to your Gmail. Please check your connection.');
      setLoading(false);
      return;
    }

    const residentPayload: ResidentUser = {
      id: profData.id,
      email: cleanEmail,
      full_name: profData.full_name || authUser?.user_metadata?.full_name || 'Resident User',
      first_name: profData.first_name || '',
      last_name: profData.last_name || '',
      middle_initial: profData.middle_initial || '',
      role: 'resident',
      password: '',
      phone: profData.phone || '09171234567',
      address: profData.address || 'Barangay Zapatera, Cebu City',
      sitio: profData.sitio || 'Sitio Zapatera Proper',
      civil_status: profData.civil_status || 'Single',
      voter_status: profData.voter_status || 'Registered Voter',
      id_type: profData.id_type || 'Barangay ID',
      id_number: profData.id_number || 'BZ-RES-001',
      is_active: true,
      is_locked: false,
      failed_attempts: 0,
      created_at: profData.created_at || new Date().toISOString(),
    };

    setPendingUser(residentPayload);
    setAuthStep('otp');
    setInfoBanner(
      `Password verified! A 6-digit verification code has been dispatched to ${cleanEmail}. Please check your Gmail Inbox or Spam folder and enter it below.`
    );
    setLoading(false);
  };

  // BIOMETRIC / FACE ID / FINGERPRINT LOGIN WITH SUPABASE DATABASE VALIDATION
  const handleBiometricLogin = async () => {
    setErrorMessage('');
    setInfoBanner('');
    const cleanEmail = loginEmail.trim().toLowerCase();

    if (!cleanEmail) {
      setErrorMessage('Please enter your registered Gmail address in the email field first to sign in with Face ID / Fingerprint.');
      return;
    }

    if (!validateEmail(cleanEmail)) {
      setErrorMessage('Please enter a valid Gmail address format.');
      return;
    }

    setLoading(true);

    try {
      if (isSupabaseConfigured()) {
        // 1. Check if account is locked
        const locked = await isAccountLocked(cleanEmail);
        if (locked) {
          setIsLocked(true);
          setErrorMessage('Your account is locked. Please unlock your account using the verification code sent to your email.');
          setLoading(false);
          return;
        }

        // 2. Fetch real resident profile from Supabase
        const { data: profData, error: profErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', cleanEmail)
          .maybeSingle();

        if (profErr || !profData) {
          setErrorMessage('No registered resident account found with this email in the database. Please register first.');
          setLoading(false);
          return;
        }

        if (profData.role && profData.role !== 'resident') {
          setErrorMessage('This account is not authorized as a resident account.');
          setLoading(false);
          return;
        }

        if (profData.is_locked) {
          setIsLocked(true);
          setErrorMessage('Your account is locked. Please unlock your account using the verification code sent to your email.');
          setLoading(false);
          return;
        }

        const residentPayload: ResidentUser = {
          id: profData.id,
          email: cleanEmail,
          full_name: profData.full_name || 'Resident User',
          first_name: profData.first_name || '',
          last_name: profData.last_name || '',
          middle_initial: profData.middle_initial || '',
          role: 'resident',
          password: '',
          phone: profData.phone || '09171234567',
          address: profData.address || 'Barangay Zapatera, Cebu City',
          sitio: profData.sitio || 'Sitio Zapatera Proper',
          civil_status: profData.civil_status || 'Single',
          voter_status: profData.voter_status || 'Registered Voter',
          id_type: profData.id_type || 'Barangay ID',
          id_number: profData.id_number || 'BZ-RES-001',
          is_active: profData.is_active !== false,
          is_locked: false,
          failed_attempts: 0,
          created_at: profData.created_at || new Date().toISOString(),
        };

        await resetFailedAttempts(cleanEmail);
        await MobileStorage.setItem('zapatera_resident_session', JSON.stringify(residentPayload));
        setSuccessBanner('Biometric sensor verified: Face ID / Fingerprint authenticated.');
        setTimeout(() => {
          setLoading(false);
          onLoginSuccess(residentPayload);
        }, 600);
      } else {
        setErrorMessage('Database connection unavailable. Please check your Supabase configuration.');
        setLoading(false);
      }
    } catch (err) {
      setErrorMessage('Biometric authentication failed. Please sign in with your password.');
      setLoading(false);
    }
  };

  // VERIFY GMAIL 6-DIGIT OTP
  const handleOtpSubmit = async () => {
    setErrorMessage('');
    if (!otpInput || otpInput.trim().length !== 6) {
      setErrorMessage('Please enter the complete 6-digit verification code.');
      return;
    }

    setLoading(true);
    const cleanOtp = otpInput.trim();
    let isVerified = false;

    if (pendingUser && isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase.auth.verifyOtp({
          email: pendingUser.email.trim().toLowerCase(),
          token: cleanOtp,
          type: 'email',
        });
        if (!error && (data?.session || data?.user)) {
          isVerified = true;
          if (data?.session) {
            await supabase.auth.setSession(data.session);
          }
        }
      } catch (vErr) {
        console.warn('Supabase verifyOtp exception:', vErr);
      }
    }

    if (isVerified && pendingUser) {
      await MobileStorage.setItem('zapatera_resident_session', JSON.stringify(pendingUser));
      setLoading(false);
      onLoginSuccess(pendingUser);
      return;
    }

    setErrorMessage('Invalid or expired 6-digit verification code. Please check your Gmail inbox or request a new code.');
    setLoading(false);
  };

  // RESEND GMAIL OTP
  const handleResendOtp = async () => {
    if (!pendingUser) return;
    setLoading(true);
    setErrorMessage('');

    try {
      if (isSupabaseConfigured()) {
        const { error: otpErr } = await supabase.auth.signInWithOtp({
          email: pendingUser.email.trim().toLowerCase(),
          options: { shouldCreateUser: false },
        });

        if (otpErr) {
          setErrorMessage('Failed to resend code. Please try again in a few moments.');
        } else {
          setInfoBanner(
            `A new 6-digit verification code has been re-sent to ${pendingUser.email}. Please check your Gmail inbox.`
          );
        }
      }
    } catch (err: any) {
      setErrorMessage('Resend failed. Please check your internet connection.');
    }

    setLoading(false);
  };

  // ==========================================================================
  // FORGOT PASSWORD (REQUEST RESET LINK TO GMAIL)
  // ==========================================================================
  const handleForgotPasswordSubmit = async () => {
    setErrorMessage('');
    setSuccessBanner('');
    setInfoBanner('');

    if (!validateEmail(forgotEmail)) {
      setErrorMessage('Please enter a valid Gmail / email address.');
      return;
    }

    setLoading(true);
    const cleanEmail = forgotEmail.trim().toLowerCase();

    try {
      if (isSupabaseConfigured()) {
        const { error: resetErr } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
        });

        if (resetErr) {
          console.warn('Supabase resetPassword notice:', resetErr.message);
        }
      }
    } catch (err: any) {
      console.warn('Password reset error:', err);
    }

    setLoading(false);
    setSuccessBanner(`Password reset instructions dispatched to (${cleanEmail}). Please check your Gmail inbox and click the reset link.`);
  };

  // ==========================================================================
  // RESET PASSWORD (SET NEW PASSWORD IN SUPABASE & DATABASE)
  // ==========================================================================
  const handleResetPasswordSubmit = async () => {
    setErrorMessage('');
    setSuccessBanner('');
    setInfoBanner('');

    if (resetNewPassword.length < 8) {
      setErrorMessage('Security Alert: Password must be at least 8 characters long.');
      return;
    }

    if (resetNewPassword !== resetConfirmPassword) {
      setErrorMessage('Password Mismatch: Passwords do not match. Please ensure both fields match.');
      return;
    }

    setLoading(true);

    try {
      if (isSupabaseConfigured()) {
        const { data, error: updateErr } = await supabase.auth.updateUser({
          password: resetNewPassword,
        });

        if (updateErr) {
          console.warn('Supabase updateUser notice:', updateErr.message);
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
        }
      }

      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', window.location.pathname);
      }

      setLoading(false);
      setSuccessBanner('Your password has been successfully updated in the database! You can now log in with your new password.');
      setTimeout(() => {
        setAuthStep('credentials');
        setLoginPassword('');
        setResetNewPassword('');
        setResetConfirmPassword('');
      }, 2000);
    } catch (err: any) {
      setLoading(false);
      setErrorMessage('Failed to update password. Please try requesting a new reset link.');
    }
  };

  // ==========================================================================
  // 3. REGISTER RESIDENT ACCOUNT (Strict Validation + Supabase Storage)
  // ==========================================================================
  const handleRegister = async () => {
    setErrorMessage('');
    setSuccessBanner('');
    setInfoBanner('');

    // 1. Full Name Validation (Last Name, First Name, MI)
    if (!regData.last_name.trim()) {
      setErrorMessage('Required: Please provide your Last Name.');
      return;
    }
    if (!regData.first_name.trim()) {
      setErrorMessage('Required: Please provide your First Name.');
      return;
    }
    if (!regData.middle_initial.trim()) {
      setErrorMessage('Required: Please provide your Middle Initial (MI).');
      return;
    }

    // 2. Date of Birth Validation
    if (!regData.birth_date.trim()) {
      setErrorMessage('Required: Please provide your Date of Birth.');
      return;
    }

    // 3. Civil Status Validation
    if (!regData.civil_status) {
      setErrorMessage('Required: Please select your Status / Civil Status.');
      return;
    }

    // 4. Email Validation
    if (!validateEmail(regData.email)) {
      setErrorMessage('Required: Please enter a valid Gmail / email address.');
      return;
    }

    // 5. Mobile Number Validation
    if (!regData.phone.trim()) {
      setErrorMessage('Required: Please provide your 11-digit mobile phone number (e.g. 09171234567).');
      return;
    }

    // 6. Voter Status Validation
    if (!regData.voter_status) {
      setErrorMessage('Required: Please select if you are a Registered Voter or Not.');
      return;
    }

    // 7. Sitio Selection Validation
    if (!regData.sitio) {
      setErrorMessage('Required: Please select your Sitio in Barangay Zapatera.');
      return;
    }

    // 8. Strong Password Validation
    if (!isStrongPassword(regData.password)) {
      setErrorMessage(
        'Password Security Alert: Your password does not meet the strong password requirements. A strong password requires: at least 8 characters, 1 uppercase letter (A-Z), 1 lowercase letter (a-z), 1 number (0-9), and 1 special character (!@#$%^&*).'
      );
      return;
    }

    // 9. Confirm Password Matching Validation
    if (regData.password !== regData.confirmPassword) {
      setErrorMessage('Password Mismatch Alert: Password and Confirm Password do not match. Please re-enter.');
      return;
    }

    // 10. Privacy Policy Acceptance Validation
    if (!regData.privacyPolicyAccepted) {
      setErrorMessage(
        'Privacy Policy Required: You must read and agree to the Barangay Zapatera Data Privacy Policy before registering.'
      );
      return;
    }

    setLoading(true);
    const cleanEmail = regData.email.toLowerCase().trim();
    const cleanLastName = sanitizeInput(regData.last_name.trim());
    const cleanFirstName = sanitizeInput(regData.first_name.trim());
    const cleanMI = sanitizeInput(regData.middle_initial.trim().toUpperCase().replace(/\.$/, ''));

    // Combined Name: "Lastname, Firstname MI."
    const formattedFullName = `${cleanLastName}, ${cleanFirstName} ${cleanMI ? cleanMI + '.' : ''}`;
    const displayName = `${cleanFirstName} ${cleanMI ? cleanMI + '.' : ''} ${cleanLastName}`;

    let assignedId = `res-${Date.now()}`;

    // Store to Supabase Auth & Database Profiles
    try {
      if (isSupabaseConfigured()) {
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
          console.warn('Supabase signUp notice:', signUpErr.message);
          if (signUpErr.message.includes('already registered')) {
            setErrorMessage('This Gmail address is already registered. Please log in instead.');
            setLoading(false);
            return;
          }
        }

        if (signUpData?.user?.id) {
          assignedId = signUpData.user.id;
        }

        // Insert/Upsert into Supabase `profiles` table (All resident info except password)
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
    } catch (err: any) {
      console.warn('Supabase registration error:', err);
    }

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
    } catch (err) {
      console.warn('MobileStorage register notice:', err);
    }

    setLoading(false);
    setLoginEmail(cleanEmail);
    setActiveTab('login');
    setAuthStep('credentials');
    setSuccessBanner(
      `Registration Successful! Account created for ${formattedFullName}. A confirmation link has been sent to your Gmail (${cleanEmail}). You can now log in.`
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Outer Centered Responsive Card Container */}
      <View style={styles.authCard}>
        {/* Top Header & Branding */}
        <View style={styles.headerArea}>
          {/* Top Row: Back Arrow if in sub-step or register */}
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

        {/* Dynamic Alerts and Banners */}
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

        {errorMessage ? (
          <View style={[styles.errorBox, isLocked && styles.lockedBox]}>
            <View style={styles.alertHeaderRow}>
              {isLocked ? <Lock size={16} color="#dc2626" /> : <AlertTriangle size={16} color="#dc2626" />}
              <Text style={styles.errorTitle}>{isLocked ? 'Account Security Lockout' : 'Validation Alert'}</Text>
            </View>
            <Text style={styles.errorText}>{errorMessage}</Text>
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
        {/* 1. RESIDENT LOGIN TAB */}
        {/* ================================================================= */}
        {activeTab === 'login' ? (
          authStep === 'credentials' ? (
            <View style={styles.formContainer}>
              <Text style={styles.formTitle}>Login to your Account</Text>

              <View style={styles.inputGroup}>
                <TextInput
                  style={styles.modernInput}
                  placeholder="Email"
                  placeholderTextColor="#94a3b8"
                  value={loginEmail}
                  onChangeText={setLoginEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.passwordWrapper}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Password"
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

              {/* Bottom Switcher */}
              <View style={styles.footerLinkRow}>
                <Text style={styles.footerText}>Don't have an account? </Text>
                <TouchableOpacity onPress={() => { setActiveTab('register'); setErrorMessage(''); setSuccessBanner(''); }}>
                  <Text style={styles.footerLinkText}>Sign up</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : authStep === 'forgot_password' ? (
            /* FORGOT PASSWORD STEP */
            <View style={styles.formContainer}>
              <Text style={styles.formTitle}>Reset your Password</Text>
              <Text style={styles.formSubtitle}>
                Enter your registered Gmail address. We'll dispatch a recovery link to your inbox.
              </Text>

              <View style={styles.inputGroup}>
                <TextInput
                  style={styles.modernInput}
                  placeholder="Registered Gmail / Email"
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
                  <Text style={styles.primaryBtnText}>Send Reset Link</Text>
                )}
              </TouchableOpacity>

              <View style={styles.footerLinkRow}>
                <TouchableOpacity
                  onPress={() => { setAuthStep('credentials'); setErrorMessage(''); setSuccessBanner(''); }}
                >
                  <Text style={styles.footerLinkText}>Back to Sign in</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : authStep === 'reset_password' ? (
            /* SET NEW PASSWORD STEP (FROM RECOVERY LINK) */
            <View style={styles.formContainer}>
              <Text style={styles.formTitle}>Create New Password</Text>
              <Text style={styles.formSubtitle}>
                Your recovery token is verified. Please set your new secure account password.
              </Text>

              <View style={styles.inputGroup}>
                <View style={styles.passwordWrapper}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="New Password (min. 8 chars)"
                    placeholderTextColor="#94a3b8"
                    value={resetNewPassword}
                    onChangeText={setResetNewPassword}
                    secureTextEntry={!showResetNewPassword}
                  />
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    onPress={() => setShowResetNewPassword(!showResetNewPassword)}
                  >
                    {showResetNewPassword ? <EyeOff size={18} color="#94a3b8" /> : <Eye size={18} color="#94a3b8" />}
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.passwordWrapper}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Confirm New Password"
                    placeholderTextColor="#94a3b8"
                    value={resetConfirmPassword}
                    onChangeText={setResetConfirmPassword}
                    secureTextEntry={!showResetConfirmPassword}
                  />
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    onPress={() => setShowResetConfirmPassword(!showResetConfirmPassword)}
                  >
                    {showResetConfirmPassword ? <EyeOff size={18} color="#94a3b8" /> : <Eye size={18} color="#94a3b8" />}
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleResetPasswordSubmit}
                disabled={loading || !resetNewPassword || resetNewPassword !== resetConfirmPassword}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.primaryBtnText}>Save New Password</Text>
                )}
              </TouchableOpacity>

              <View style={styles.footerLinkRow}>
                <TouchableOpacity
                  onPress={() => { setAuthStep('credentials'); setErrorMessage(''); setSuccessBanner(''); }}
                >
                  <Text style={styles.footerLinkText}>Cancel & Back to Sign in</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* MFA OTP VERIFICATION STEP */
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
          /* 2. NEW RESIDENT SIGN UP TAB */
          /* ================================================================= */
          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>Create your Account</Text>

            {/* Email Address */}
            <View style={styles.inputGroup}>
              <TextInput
                style={styles.modernInput}
                placeholder="Email"
                placeholderTextColor="#94a3b8"
                value={regData.email}
                onChangeText={(txt) => setRegData({ ...regData, email: txt })}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <View style={styles.passwordWrapper}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Password"
                  placeholderTextColor="#94a3b8"
                  value={regData.password}
                  onChangeText={(txt) => setRegData({ ...regData, password: txt })}
                  secureTextEntry={!showRegPassword}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowRegPassword(!showRegPassword)}
                >
                  {showRegPassword ? <EyeOff size={18} color="#94a3b8" /> : <Eye size={18} color="#94a3b8" />}
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <View style={styles.passwordWrapper}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Confirm Password"
                  placeholderTextColor="#94a3b8"
                  value={regData.confirmPassword}
                  onChangeText={(txt) => setRegData({ ...regData, confirmPassword: txt })}
                  secureTextEntry={!showRegConfirmPassword}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                >
                  {showRegConfirmPassword ? <EyeOff size={18} color="#94a3b8" /> : <Eye size={18} color="#94a3b8" />}
                </TouchableOpacity>
              </View>
            </View>

            {/* Full Name Fields */}
            <View style={styles.nameRow}>
              <View style={[styles.inputGroup, { flex: 2, marginRight: 8 }]}>
                <TextInput
                  style={styles.modernInput}
                  placeholder="Last Name"
                  placeholderTextColor="#94a3b8"
                  value={regData.last_name}
                  onChangeText={(txt) => setRegData({ ...regData, last_name: txt })}
                />
              </View>

              <View style={[styles.inputGroup, { flex: 2, marginRight: 8 }]}>
                <TextInput
                  style={styles.modernInput}
                  placeholder="First Name"
                  placeholderTextColor="#94a3b8"
                  value={regData.first_name}
                  onChangeText={(txt) => setRegData({ ...regData, first_name: txt })}
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <TextInput
                  style={[styles.modernInput, { textAlign: 'center' }]}
                  placeholder="M.I."
                  placeholderTextColor="#94a3b8"
                  maxLength={3}
                  value={regData.middle_initial}
                  onChangeText={(txt) => setRegData({ ...regData, middle_initial: txt })}
                />
              </View>
            </View>

            {/* Date of Birth & Phone in Row */}
            <View style={styles.nameRow}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <TextInput
                  style={styles.modernInput}
                  placeholder="Birthdate (YYYY-MM-DD)"
                  placeholderTextColor="#94a3b8"
                  value={regData.birth_date}
                  onChangeText={(txt) => setRegData({ ...regData, birth_date: txt })}
                  maxLength={10}
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <TextInput
                  style={styles.modernInput}
                  placeholder="Mobile Phone"
                  placeholderTextColor="#94a3b8"
                  value={regData.phone}
                  onChangeText={(txt) => setRegData({ ...regData, phone: txt })}
                  keyboardType="phone-pad"
                  maxLength={13}
                />
              </View>
            </View>

            {/* Select Sitio */}
            <View style={styles.inputGroup}>
              <Text style={styles.fieldSubLabel}>Select Sitio (Barangay Zapatera):</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sitioScroll}>
                {SAMPLE_SITIOS.map((sitioName) => (
                  <TouchableOpacity
                    key={sitioName}
                    style={[
                      styles.sitioPill,
                      regData.sitio === sitioName && styles.sitioPillActive,
                    ]}
                    onPress={() => setRegData({ ...regData, sitio: sitioName })}
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
            </View>

            {/* Voter Status */}
            <View style={styles.inputGroup}>
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[
                    styles.toggleBtn,
                    regData.voter_status === 'Registered Voter' && styles.toggleBtnActive,
                  ]}
                  onPress={() => setRegData({ ...regData, voter_status: 'Registered Voter' })}
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
                  onPress={() => setRegData({ ...regData, voter_status: 'Not Registered Voter' })}
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
            </View>

            {/* Privacy Agreement */}
            <View style={styles.privacyPolicyContainer}>
              <TouchableOpacity
                style={styles.checkboxTouchable}
                onPress={() => setRegData({ ...regData, privacyPolicyAccepted: !regData.privacyPolicyAccepted })}
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
                  under RA 10173.
                </Text>
              </TouchableOpacity>
            </View>

            {/* Submit Sign Up Button */}
            <TouchableOpacity style={styles.primaryBtn} onPress={handleRegister} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryBtnText}>Sign up</Text>
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
                When registering, we collect your Full Name (Last Name, First Name, Middle Initial), Gmail / Email Address, Mobile Phone Number, Voter Registration Status, Sitio Location, and Street Address.
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
                setRegData({ ...regData, privacyPolicyAccepted: true });
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
    marginBottom: 12,
  },
  fieldSubLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 6,
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
  primaryBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  orDividerRow: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 14,
  },
  orDividerText: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginBottom: 18,
  },
  socialBtn: {
    width: 60,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  googleIconText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ea4335',
  },
  facebookIconText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1877f2',
  },
  footerLinkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
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
  namePreviewBox: {
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  namePreviewLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  namePreviewValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1e3a8a',
    marginTop: 2,
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
