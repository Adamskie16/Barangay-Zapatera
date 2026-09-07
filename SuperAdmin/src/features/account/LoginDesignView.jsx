// SuperAdmin/src/features/account/LoginDesignView.jsx
import React, { useState, useEffect } from 'react';
import {
  Image as ImageIcon,
  Upload,
  Camera,
  Trash2,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Lock,
  ShieldCheck,
  Sparkles,
  Eye,
} from 'lucide-react';
import { StorageService } from '../../core/storage';
import { supabase, isSupabaseConfigured } from '../../core/supabase';

const DEFAULT_DESIGN = {
  login_bg_url: '/auth-bg.jpg',
  login_title: 'Barangay Zapatera Super Admin Portal',
  login_badge: 'Executive Administration',
  login_description:
    'Restricted executive interface for complete system governance, administrative user provisioning, and secure document records.',
};

export default function LoginDesignView({ isDarkMode }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const [formData, setFormData] = useState({
    login_bg_url: DEFAULT_DESIGN.login_bg_url,
    login_title: DEFAULT_DESIGN.login_title,
    login_badge: DEFAULT_DESIGN.login_badge,
    login_description: DEFAULT_DESIGN.login_description,
  });

  const [initialData, setInitialData] = useState(formData);
  const [activeTab, setActiveTab] = useState('editor'); // 'editor' | 'preview'

  const showNotification = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 4000);
  };

  useEffect(() => {
    let isMounted = true;
    const loadConfig = async () => {
      setLoading(true);
      try {
        const cfg = await StorageService.getConfigAsync();
        if (isMounted && cfg) {
          const loaded = {
            login_bg_url: cfg.login_bg_url || DEFAULT_DESIGN.login_bg_url,
            login_title: cfg.login_title || DEFAULT_DESIGN.login_title,
            login_badge: cfg.login_badge || DEFAULT_DESIGN.login_badge,
            login_description: cfg.login_description || DEFAULT_DESIGN.login_description,
          };
          setFormData(loaded);
          setInitialData(loaded);
        }
      } catch (err) {
        console.error('Failed to load login branding config:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadConfig();
    return () => {
      isMounted = false;
    };
  }, []);

  // Handle local image file / camera selection
  const handleFileChange = (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showNotification('Please select a valid image file (JPG, PNG, WebP).', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result;
      if (dataUrl) {
        setFormData((prev) => ({ ...prev, login_bg_url: dataUrl }));
        showNotification('Image loaded into preview. Click "Save & Apply" to publish.', 'info');
      }
    };
    reader.readAsDataURL(file);
  };

  // Trigger file input dialog
  const triggerFileInput = (captureMode = null) => {
    if (typeof document === 'undefined') return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (captureMode) {
      input.capture = captureMode;
    }
    input.onchange = handleFileChange;
    input.click();
  };

  // Save changes to Supabase & StorageService
  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);

    try {
      const currentConfig = StorageService.getConfig();
      const updatedConfig = {
        ...currentConfig,
        login_bg_url: formData.login_bg_url,
        login_title: formData.login_title.trim() || DEFAULT_DESIGN.login_title,
        login_badge: formData.login_badge.trim() || DEFAULT_DESIGN.login_badge,
        login_description: formData.login_description.trim() || DEFAULT_DESIGN.login_description,
        updated_at: new Date().toISOString(),
      };

      await StorageService.saveConfig(updatedConfig);
      setInitialData(formData);
      showNotification('Login screen picture and design updated successfully!', 'success');
    } catch (err) {
      console.error('Error saving login screen design:', err);
      showNotification('Failed to save design settings. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Reset to default design
  const handleResetToDefault = async () => {
    if (!window.confirm('Reset the login screen background picture, title, and description to system default?')) {
      return;
    }
    setSaving(true);
    try {
      const currentConfig = StorageService.getConfig();
      const resetConfig = {
        ...currentConfig,
        login_bg_url: DEFAULT_DESIGN.login_bg_url,
        login_title: DEFAULT_DESIGN.login_title,
        login_badge: DEFAULT_DESIGN.login_badge,
        login_description: DEFAULT_DESIGN.login_description,
        updated_at: new Date().toISOString(),
      };

      await StorageService.saveConfig(resetConfig);
      setFormData(DEFAULT_DESIGN);
      setInitialData(DEFAULT_DESIGN);
      showNotification('Login screen design reset to system default.', 'success');
    } catch (err) {
      console.error('Failed to reset login design:', err);
      showNotification('Error resetting design.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Delete / Remove current custom picture
  const handleDeletePicture = () => {
    setFormData((prev) => ({
      ...prev,
      login_bg_url: DEFAULT_DESIGN.login_bg_url,
    }));
    showNotification('Custom picture removed. Click "Save & Apply" to confirm.', 'info');
  };

  const hasUnsavedChanges = JSON.stringify(formData) !== JSON.stringify(initialData);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] space-y-3">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-xs font-semibold text-slate-400">Loading Login Design Settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Toast Notification Banner */}
      {toast.show && (
        <div
          className={`p-4 rounded-xl shadow-lg border flex items-center justify-between text-xs font-semibold transition-all transform duration-300 ${
            toast.type === 'error'
              ? 'bg-rose-950/90 text-rose-200 border-rose-800'
              : toast.type === 'info'
              ? 'bg-blue-950/90 text-blue-200 border-blue-800'
              : 'bg-emerald-950/90 text-emerald-200 border-emerald-800'
          }`}
        >
          <div className="flex items-center space-x-2">
            {toast.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
          <button
            onClick={() => setToast({ show: false, message: '', type: 'success' })}
            className="text-slate-400 hover:text-white text-xs ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Banner Card */}
      <div
        className={`p-6 rounded-2xl border shadow-sm transition-colors ${
          isDarkMode
            ? 'bg-slate-900 border-slate-800 text-white'
            : 'bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border-slate-200 text-white'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="p-2 bg-blue-500/20 border border-blue-500/30 rounded-xl text-blue-300">
                <ImageIcon className="w-5 h-5" />
              </span>
              <h1 className="text-xl font-bold tracking-tight text-white">Login Screen Design & Customization</h1>
            </div>
            <p className="text-xs text-slate-300 max-w-2xl">
              Manage the visual hero side of the Super Admin and Admin login portals. Upload pictures, change hero titles, and customize descriptions in real time.
            </p>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              onClick={handleResetToDefault}
              disabled={saving}
              className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-slate-200 border border-white/10 transition-colors flex items-center justify-center space-x-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Default</span>
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !hasUnsavedChanges}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center space-x-1.5 ${
                hasUnsavedChanges
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30'
                  : 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed'
              }`}
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>{saving ? 'Saving...' : 'Save & Apply'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Left side Live Preview & Right side Form Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Live Mockup of Login Page Left Side (~5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className={`text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Live Split-Screen Preview (Left Side)
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono font-bold">
              50% Screen Width
            </span>
          </div>

          {/* Mockup Frame */}
          <div className="relative rounded-2xl overflow-hidden border border-slate-700 shadow-2xl bg-slate-950 min-h-[460px] flex flex-col justify-between p-6 select-none group">
            {/* Background Image */}
            <img
              src={formData.login_bg_url || DEFAULT_DESIGN.login_bg_url}
              alt="Login Background"
              className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = DEFAULT_DESIGN.login_bg_url;
              }}
            />
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/80 via-slate-950/40 to-blue-500/20 pointer-events-none" />

            {/* Top Branding */}
            <div className="relative z-10 flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg">
                <ShieldCheck className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-widest text-blue-300 font-bold block">
                  {formData.login_badge || 'Executive Administration'}
                </span>
                <h4 className="text-sm font-extrabold text-white tracking-tight drop-shadow-sm">
                  Barangay Zapatera
                </h4>
              </div>
            </div>

            {/* Center Content */}
            <div className="relative z-10 my-auto py-6">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/20 backdrop-blur-md border border-blue-500/30 text-blue-200 text-[10px] font-semibold mb-3">
                <Lock className="w-3 h-3 text-blue-300" />
                <span>{formData.login_badge || 'Portal Access'}</span>
              </div>
              <h2 className="text-xl font-black text-white tracking-tight leading-tight mb-2">
                {formData.login_title || DEFAULT_DESIGN.login_title}
              </h2>
              <p className="text-xs text-slate-200/90 leading-relaxed">
                {formData.login_description || DEFAULT_DESIGN.login_description}
              </p>
            </div>

            {/* Bottom Footer */}
            <div className="relative z-10 flex items-center justify-between text-[10px] text-slate-300/80 pt-3 border-t border-white/10">
              <span>© 2026 Barangay Zapatera, Cebu City</span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Online
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 text-center">
            This card simulates how visitors see the left panel on the desktop login screen.
          </p>
        </div>

        {/* Right Column: Customization Controls Form (~7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div
            className={`p-6 sm:p-7 rounded-2xl border shadow-sm transition-colors ${
              isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            <div className="border-b pb-4 mb-6 border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold">Image & Text Configuration</h2>
                <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  Upload a custom banner photo and adjust the typography and messaging.
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                Visual Assets
              </span>
            </div>

            <form onSubmit={handleSave} className="space-y-5">
              {/* 1. Image Upload Actions */}
              <div>
                <label className={`block text-xs font-bold mb-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  1. Login Hero Picture / Background *
                </label>

                {/* Upload Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-3">
                  <button
                    type="button"
                    onClick={() => triggerFileInput(null)}
                    className="flex items-center justify-center space-x-2 p-3 rounded-xl border border-dashed text-xs font-bold transition-all bg-blue-50/50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40"
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload Picture</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => triggerFileInput('environment')}
                    className="flex items-center justify-center space-x-2 p-3 rounded-xl border border-dashed text-xs font-bold transition-all bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Take Photo</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDeletePicture}
                    disabled={formData.login_bg_url === DEFAULT_DESIGN.login_bg_url}
                    className={`flex items-center justify-center space-x-2 p-3 rounded-xl border text-xs font-bold transition-all ${
                      formData.login_bg_url !== DEFAULT_DESIGN.login_bg_url
                        ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-100'
                        : 'bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Remove Picture</span>
                  </button>
                </div>

                {/* Direct Image URL input */}
                <div>
                  <span className="text-[11px] text-slate-500 block mb-1">Or paste a Direct Image URL:</span>
                  <div className="relative">
                    <ImageIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="url"
                      placeholder="https://example.com/banner-photo.jpg"
                      value={formData.login_bg_url}
                      onChange={(e) => setFormData({ ...formData, login_bg_url: e.target.value })}
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs border transition-colors ${
                        isDarkMode
                          ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500'
                          : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* 2. Login Hero Title */}
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  2. Hero Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Barangay Zapatera Super Admin Portal"
                  value={formData.login_title}
                  onChange={(e) => setFormData({ ...formData, login_title: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold border transition-colors ${
                    isDarkMode
                      ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500'
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                  }`}
                />
              </div>

              {/* 3. Subtitle / Badge Pill */}
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  3. Badge / Subtitle Tag *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Executive Administration / Official Staff Portal"
                  value={formData.login_badge}
                  onChange={(e) => setFormData({ ...formData, login_badge: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs border transition-colors ${
                    isDarkMode
                      ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500'
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                  }`}
                />
              </div>

              {/* 4. Hero Description */}
              <div>
                <label className={`block text-xs font-bold mb-1.5 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  4. Hero Description *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe the administrative service purpose..."
                  value={formData.login_description}
                  onChange={(e) => setFormData({ ...formData, login_description: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs leading-relaxed border transition-colors ${
                    isDarkMode
                      ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500'
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500'
                  }`}
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setFormData(initialData)}
                  disabled={!hasUnsavedChanges || saving}
                  className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                    hasUnsavedChanges
                      ? 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      : 'text-slate-400 dark:text-slate-600 cursor-not-allowed'
                  }`}
                >
                  Discard Changes
                </button>

                <button
                  type="submit"
                  disabled={saving || !hasUnsavedChanges}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center space-x-2 ${
                    hasUnsavedChanges
                      ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30'
                      : 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed'
                  }`}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>{saving ? 'Publishing Design...' : 'Save & Publish Design'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
