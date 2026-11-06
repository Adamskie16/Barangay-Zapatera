import './src/index.css';
import { registerRootComponent } from 'expo';
import { Text, TextInput, Platform } from 'react-native';
import App from './src/App';

// Ensure Google Font 'Inter' and global CSS override are injected into document.head
// even when running under Expo Metro bundler (localhost:8081) which ignores index.html
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  if (!document.getElementById('zapatera-inter-google-font')) {
    const preconnect1 = document.createElement('link');
    preconnect1.rel = 'preconnect';
    preconnect1.href = 'https://fonts.googleapis.com';
    document.head.appendChild(preconnect1);

    const preconnect2 = document.createElement('link');
    preconnect2.rel = 'preconnect';
    preconnect2.href = 'https://fonts.gstatic.com';
    preconnect2.crossOrigin = 'anonymous';
    document.head.appendChild(preconnect2);

    const fontLink = document.createElement('link');
    fontLink.id = 'zapatera-inter-google-font';
    fontLink.rel = 'stylesheet';
    fontLink.href =
      'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap';
    document.head.appendChild(fontLink);
  }

  const injectInterStyleOverride = () => {
    let styleEl = document.getElementById('zapatera-inter-font-override');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'zapatera-inter-font-override';
      styleEl.textContent = `
        :root {
          --font-sans: 'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        }
        html, body, #root, #root *, div, span, p, a, button, input, select, textarea,
        h1, h2, h3, h4, h5, h6,
        [class*="css-text-"], [class*="css-view-"], [class*="r-fontFamily-"], [dir="auto"] {
          font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;
          -webkit-font-smoothing: antialiased !important;
          -moz-osx-font-smoothing: grayscale !important;
          text-rendering: optimizeLegibility !important;
        }
      `;
    }
    if (document.head.lastElementChild !== styleEl) {
      document.head.appendChild(styleEl);
    }
  };

  injectInterStyleOverride();
  if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', injectInterStyleOverride);
    setTimeout(injectInterStyleOverride, 100);
  }
}

if (Platform.OS === 'web') {
  try {
    if (Text && Text.defaultProps == null) Text.defaultProps = {};
    if (Text && Text.defaultProps) Text.defaultProps.style = [{ fontFamily: 'Inter' }, Text.defaultProps.style];

    if (TextInput && TextInput.defaultProps == null) TextInput.defaultProps = {};
    if (TextInput && TextInput.defaultProps) TextInput.defaultProps.style = [{ fontFamily: 'Inter' }, TextInput.defaultProps.style];
  } catch {}
}

registerRootComponent(App);
