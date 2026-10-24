// Resident/src/core/fontSetup.ts
import { Platform, Text, TextInput } from 'react-native';

export const INTER_FONT_FAMILY = 'Inter';

export function ensureInterFontLoaded(): void {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    // 1. Inject Google Fonts <link> for Inter into document.head (required for Expo Metro localhost:8081)
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

    // 2. Inject high-priority <style> at the end of document.head to override react-native-web default system font
    let styleEl = document.getElementById('zapatera-inter-font-override') as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'zapatera-inter-font-override';
      styleEl.textContent = `
        :root {
          --font-sans: 'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        }
        html, body, #root, #root *,
        div, span, p, a, button, input, select, textarea, label,
        h1, h2, h3, h4, h5, h6,
        [class*="css-text-"], [class*="css-view-"], [class*="r-fontFamily-"], [dir="auto"] {
          font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;
          -webkit-font-smoothing: antialiased !important;
          -moz-osx-font-smoothing: grayscale !important;
          text-rendering: optimizeLegibility !important;
        }
      `;
      document.head.appendChild(styleEl);
    } else if (document.head.lastElementChild !== styleEl) {
      document.head.appendChild(styleEl);
    }
  }

  // 3. Set defaultProps on React Native Text and TextInput
  try {
    if ((Text as any).defaultProps == null) (Text as any).defaultProps = {};
    (Text as any).defaultProps.style = [{ fontFamily: INTER_FONT_FAMILY }, (Text as any).defaultProps.style];

    if ((TextInput as any).defaultProps == null) (TextInput as any).defaultProps = {};
    (TextInput as any).defaultProps.style = [{ fontFamily: INTER_FONT_FAMILY }, (TextInput as any).defaultProps.style];
  } catch {
    // Ignore if frozen
  }
}

// Execute immediately upon module import
ensureInterFontLoaded();
