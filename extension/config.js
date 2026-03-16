/**
 * Vigil Shield — Configuration
 *
 * Swap this file to rebrand the extension for other products.
 * All branding, endpoints, and language defaults live here.
 */
export const CONFIG = {
  // Branding
  name: 'Vigil Shield',
  agentName: 'Theepa',
  tagline: 'Voice-First IT Support + Real-Time Scam Shield',
  shieldName: 'Vigil',
  shieldTagline: '4-Agent Security Shield — 7 Tools, Fact-Check, Danger Zones',

  // Colors (Vigil theme)
  colors: {
    primary: '#4d9ff7',
    primaryGlow: 'rgba(77, 159, 247, 0.25)',
    danger: '#e57373',
    success: '#81c784',
    warning: '#f0ab00',
    surface: 'rgba(22, 24, 34, 0.95)',
    text: '#f0e6d9',
    textSub: '#b0b8c4',
    bg: '#0a0b10',
  },

  // Backend
  defaultServerUrl: 'http://localhost:8080',
  navigateEndpoint: '/api/navigate',
  screenshareWsEndpoint: '/ws/extension',

  // Languages (20 supported)
  languages: [
    { code: 'en', label: 'English', native: 'English' },
    { code: 'de', label: 'German', native: 'Deutsch' },
    { code: 'fr', label: 'French', native: 'Français' },
    { code: 'es', label: 'Spanish', native: 'Español' },
    { code: 'pt', label: 'Portuguese', native: 'Português' },
    { code: 'it', label: 'Italian', native: 'Italiano' },
    { code: 'nl', label: 'Dutch', native: 'Nederlands' },
    { code: 'tr', label: 'Turkish', native: 'Türkçe' },
    { code: 'ja', label: 'Japanese', native: '日本語' },
    { code: 'ko', label: 'Korean', native: '한국어' },
    { code: 'zh', label: 'Chinese', native: '中文' },
    { code: 'ar', label: 'Arabic', native: 'العربية' },
    { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
    { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
    { code: 'te', label: 'Telugu', native: 'తెలుగు' },
    { code: 'bn', label: 'Bengali', native: 'বাংলা' },
    { code: 'ru', label: 'Russian', native: 'Русский' },
    { code: 'pl', label: 'Polish', native: 'Polski' },
    { code: 'th', label: 'Thai', native: 'ไทย' },
    { code: 'vi', label: 'Vietnamese', native: 'Tiếng Việt' },
  ],

  // Annotation styles
  annotations: {
    highlightBorderWidth: 3,
    highlightPadding: 4,
    labelFontSize: 13,
    arrowSize: 8,
    animationDuration: '0.3s',
    pulseColor: 'rgba(77, 159, 247, 0.4)',
  },

  // DOM capture limits
  domCapture: {
    maxElements: 150,
    maxTextLength: 80,
    interactiveTags: [
      'A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA',
      'LABEL', 'SUMMARY', 'DETAILS', '[role="button"]',
      '[role="link"]', '[role="tab"]', '[role="menuitem"]',
      '[onclick]', '[tabindex]',
    ],
  },
};
