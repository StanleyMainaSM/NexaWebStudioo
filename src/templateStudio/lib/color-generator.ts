import { Theme } from '../types';

export const getTheme = (industry: string, styleInput: string, colorPrefInput: string): Theme => {
  const styles = ['Modern', 'Minimal', 'Luxury', 'Bold', 'Corporate', 'Futuristic', 'Editorial', 'Creative', 'Elegant', 'Playful'];
  const colors = ['Blue', 'Purple', 'Green', 'Red', 'Orange', 'Gold', 'Black', 'Neutral'];
  
  const style = styleInput === 'Auto' || styleInput === 'AI Choose' ? styles[Math.floor(Math.random() * styles.length)] : styleInput;
  const colorPref = colorPrefInput === 'Auto' || colorPrefInput === 'AI chooses' ? colors[Math.floor(Math.random() * colors.length)] : colorPrefInput;

  // Default fallback
  let theme: Theme = {
    primary: '#09090b',
    secondary: '#f4f4f5',
    accent: '#3b82f6',
    background: '#ffffff',
    text: '#09090b',
    fontFamily: '"Inter", sans-serif',
    borderRadius: '0.5rem'
  };

  // 1. Establish Base Palettes based on color preference
  switch (colorPref) {
    case 'Blue':
      theme.primary = '#2563eb';
      theme.secondary = '#eff6ff';
      theme.accent = '#3b82f6';
      break;
    case 'Purple':
      theme.primary = '#7c3aed';
      theme.secondary = '#f5f3ff';
      theme.accent = '#8b5cf6';
      break;
    case 'Green':
      theme.primary = '#16a34a';
      theme.secondary = '#f0fdf4';
      theme.accent = '#22c55e';
      break;
    case 'Red':
      theme.primary = '#dc2626';
      theme.secondary = '#fef2f2';
      theme.accent = '#ef4444';
      break;
    case 'Orange':
      theme.primary = '#ea580c';
      theme.secondary = '#fff7ed';
      theme.accent = '#f97316';
      break;
    case 'Gold':
      theme.primary = '#d97706';
      theme.secondary = '#fffbeb';
      theme.accent = '#f59e0b';
      break;
    case 'Black':
      theme.primary = '#000000';
      theme.secondary = '#f4f4f5';
      theme.accent = '#333333';
      break;
    case 'Neutral':
      theme.primary = '#52525b';
      theme.secondary = '#fafafa';
      theme.accent = '#71717a';
      break;
    case 'AI chooses':
      // AI Logic: Map industry to appropriate colors
      if (['Finance', 'Law', 'Corporate', 'Security'].includes(industry)) {
        theme.primary = '#1e3a8a'; // Deep Navy
        theme.secondary = '#f0f9ff';
        theme.accent = '#0369a1';
      } else if (['Healthcare', 'Dental', 'Medical Clinic'].includes(industry)) {
        theme.primary = '#0d9488'; // Teal
        theme.secondary = '#f0fdfa';
        theme.accent = '#14b8a6';
      } else if (['Restaurant', 'Food', 'Cafe'].includes(industry)) {
        theme.primary = '#9f1239'; // Rose/Burgundy
        theme.secondary = '#fff1f2';
        theme.accent = '#be123c';
      } else if (['Beauty', 'Salon', 'Fashion'].includes(industry)) {
        theme.primary = '#be185d'; // Pink
        theme.secondary = '#fdf2f8';
        theme.accent = '#db2777';
      } else if (['Real Estate', 'Architecture'].includes(industry)) {
        theme.primary = '#1c1917'; // Dark Stone
        theme.secondary = '#f5f5f4';
        theme.accent = '#44403c';
      } else if (['Agriculture', 'Environment'].includes(industry)) {
        theme.primary = '#166534'; // Forest
        theme.secondary = '#f0fdf4';
        theme.accent = '#15803d';
      } else if (['SaaS', 'AI', 'Technology'].includes(industry)) {
        theme.primary = '#4338ca'; // Indigo
        theme.secondary = '#eef2ff';
        theme.accent = '#6366f1';
      } else {
        theme.primary = '#0f172a'; // Slate
        theme.secondary = '#f8fafc';
        theme.accent = '#334155';
      }
      break;
    default:
      // Custom/Unknown
      theme.primary = '#09090b';
      theme.secondary = '#f4f4f5';
      theme.accent = '#3b82f6';
      break;
  }

  // 2. Adjust based on Style (Typography, Border Radius, Background Modifiers)
  switch (style) {
    case 'Modern':
      theme.fontFamily = '"Inter", sans-serif';
      theme.borderRadius = '0.5rem';
      break;
    case 'Minimal':
      theme.fontFamily = '"Space Grotesk", sans-serif';
      theme.borderRadius = '0px';
      theme.background = '#ffffff'; // Clean white
      theme.secondary = '#f4f4f5';
      break;
    case 'Luxury':
      theme.fontFamily = '"Playfair Display", serif';
      theme.borderRadius = '0px';
      theme.background = '#faf9f6'; // Off-white/cream
      if (colorPref === 'Black' || colorPref === 'AI chooses') {
        theme.primary = '#171717';
        theme.accent = '#d4af37'; // Gold accent
      }
      break;
    case 'Bold':
      theme.fontFamily = '"Outfit", sans-serif';
      theme.borderRadius = '1rem';
      break;
    case 'Corporate':
      theme.fontFamily = '"Roboto", sans-serif';
      theme.borderRadius = '0.25rem';
      break;
    case 'Futuristic':
      theme.fontFamily = '"Orbitron", sans-serif'; // Or just a techy font like 'Space Grotesk'
      theme.borderRadius = '0.75rem';
      theme.background = '#020617'; // Very dark blue
      theme.text = '#f8fafc';
      theme.secondary = '#0f172a';
      if (theme.primary === '#000000' || theme.primary === '#1c1917' || theme.primary === '#09090b') {
        theme.primary = '#3b82f6'; // Ensure primary is visible
      }
      break;
    case 'Editorial':
      theme.fontFamily = '"Cormorant Garamond", serif';
      theme.borderRadius = '0px';
      theme.background = '#fdfbf7';
      break;
    case 'Creative':
      theme.fontFamily = '"Syne", sans-serif';
      theme.borderRadius = '2rem';
      break;
    case 'Elegant':
      theme.fontFamily = '"Cinzel", serif'; // Or a clean serif
      theme.borderRadius = '0.125rem';
      break;
    case 'Playful':
      theme.fontFamily = '"Quicksand", sans-serif';
      theme.borderRadius = '9999px'; // fully rounded
      break;
  }

  // Handle Dark mode for specific combinations if not handled
  if (style === 'Bold' && colorPref === 'Black') {
    theme.background = '#09090b';
    theme.text = '#f8fafc';
    theme.secondary = '#18181b';
  }

  return theme;
};
