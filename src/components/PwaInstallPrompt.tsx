import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { getPwaInstallSnapshot, promptPwaInstall, subscribePwaInstall, type PwaInstallSnapshot } from '../lib/pwaInstall';

function getInstallGuidance(): { heading: string; steps: string; supported: boolean } {
  if (typeof navigator === 'undefined') return { heading: 'Install Avelixa', steps: 'Open Avelixa in a supported browser to check installation options.', supported: false };
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
  if (ios) return { heading: 'Add Avelixa to your Home Screen', steps: /Safari/i.test(ua) ? 'In Safari, tap Share, then “Add to Home Screen”.' : 'Open this page in Safari, tap Share, then “Add to Home Screen”.', supported: true };
  if (/Android/i.test(ua)) return { heading: 'Install Avelixa', steps: 'In Chrome or Edge, open the browser menu and choose “Install app” or “Add to Home screen”. If it is not shown, this browser or page may not currently be eligible.', supported: true };
  if (ua.includes('Edg/') || ua.includes('Edge/')) return { heading: 'Install Avelixa', steps: 'In Microsoft Edge, open Settings and more (⋯), then choose Apps → Install this site as an app, if available.', supported: true };
  if (ua.includes('Chrome/') && !ua.includes('Edg/') && !ua.includes('OPR/')) return { heading: 'Install Avelixa', steps: 'In Chrome, select the install ic���q�^