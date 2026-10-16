import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { getPwaInstallSnapshot, promptPwaInstall, subscribePwaInstall, type PwaInstallSnapshot } from '../lib/pwaInstall';

function getInstallGuidance(): { heading: string; steps: string; supported: boolean } {
  if (typeof navigator === 'undefined') {
    return { heading: 'Install Avelixa', steps: 'Open Avelixa in a supported browser to check installation options.', supported: false };
  }
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
  if (ios) {
    return {
      heading: 'Add Avelixa to your Home Screen',
      steps: /Safari/i.test(ua)
        ? 'In Safari, tap Share, then “Add to Home Screen”.'
        : 'Open this page in Safari, tap Share, then “Add to Home Screen”.',
      supported: true,
    };
  }
  if (/Android/i.test(ua)) {
    return {
      heading: 'Install Avelixa',
      steps: 'Open this page in Chrome or Edge and use the browser menu’s “Install app” or “Add to Home screen” option if available.',
      supported: true,
    };
  }
  if (ua.includes('Edg/') || ua.includes('Edge/')) {
    return {
      heading: 'Install Avelixa',
      steps: 'In Microsoft Edge, open Settings and more (⋯), then choose Apps → Install this site as an app, if available.',
      supported: true,
    };
  }
  if (ua.includes('Chrome/') && !ua.includes('Edg/') && !ua.includes('OPR/')) {
    return {
      heading: 'Install Avelixa',
      steps: 'In Chrome, select the install icon in the address bar or open the menu and choose “Install Avelixa”, if available.',
      supported: true,
    };
  }
  return {
    heading: 'Installation not available here',
    steps: 'Open Avelixa in Chrome or Microsoft Edge on desktop/Android, or Safari on iPhone/iPad, to check the installation options. This browser may not support PWA installation.',
    supported: false,
  };
}

export default function PwaInstallPrompt() {
  const [snapshot, setSnapshot] = useState<PwaInstallSnapshot>(() => getPwaInstallSnapshot());
  const [visible, setVisible] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const guidance = getInstallGuidance();

  useEffect(() => {
    const unsubscribe = subscribePwaInstall(() => setSnapshot(getPwaInstallSnapshot()));
    // Re-read after subscribing so an event arriving between render and effect setup is not lost.
    setSnapshot(getPwaInstallSnapshot());
    return unsubscribe;
  }, []);

  if (snapshot.installed || !visible) return null;

  const startInstall = async () => {
    // Do not gate this call on React state: the one-shot browser event may be newer
    // than the last render. promptPwaInstall invokes prompt() synchronously if present.
    setBusy(true);
    setMessage('');
    try {
      const outcome = await promptPwaInstall();
      if (outcome === 'unavailable') {
        setMessage('Your browser has not offered a native installation prompt for this page. The button cannot force one; use the browser menu instructions below instead.');
        return;
      }
      if (outcome === 'accepted') {
        setMessage('Installation was accepted. Finish any confirmation shown by your browser.');
      } else if (outcome === 'dismissed') {
        setMessage('Installation was cancelled. Avelixa has not been marked as installed.');
      }
    } catch {
      setMessage('The browser could not open its installation prompt. Follow the steps below instead.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <aside aria-label="Install Avelixa" className="fixed bottom-4 right-4 z-[100] w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-zinc-700 bg-zinc-950 p-4 text-white shadow-2xl">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 rounded-lg bg-zinc-800 p-2" aria-hidden="true"><Download size={20} /></span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Install Avelixa</p>
          <p className="mt-1 text-sm text-zinc-300">Use Avelixa like an app on this device.</p>
        </div>
        <button type="button" onClick={() => setVisible(false)} aria-label="Dismiss installation prompt" className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"><X size={18} /></button>
      </div>

      <div className="mt-3">
        <button type="button" disabled={busy} onClick={startInstall} className="w-full rounded-lg bg-white px-3 py-2.5 text-sm font-semibold text-zinc-950 disabled:opacity-60">
          {busy ? 'Opening…' : 'Install Avelixa'}
        </button>
      </div>

      <div className="mt-3 rounded-lg bg-zinc-900 p-3" role="status">
        <p className="text-sm font-medium">{guidance.heading}</p>
        {!snapshot.promptAvailable && !busy && !message && <p className="mt-1 text-xs text-zinc-400">Native installation isn’t available right now. Use these browser instructions instead.</p>}
        <p className="mt-1 text-sm text-zinc-300">{guidance.steps}</p>
      </div>
      {message && <p role="status" className="mt-3 text-sm text-zinc-300">{message}</p>}
    </aside>
  );
}
