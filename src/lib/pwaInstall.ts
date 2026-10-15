export type InstallPromptChoice = 'accepted' | 'dismissed';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms?: string[];
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: InstallPromptChoice; platform: string }>;
}

export interface PwaInstallSnapshot {
  promptAvailable: boolean;
  installed: boolean;
}

type Listener = () => void;

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installed = isStandaloneDisplayMode();
const listeners = new Set<Listener>();

function isStandaloneDisplayMode(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)').matches === true
    || (typeof navigator !== 'undefined' && 'standalone' in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true);
}

function notify(): void {
  listeners.forEach((listener) => listener());
}

function onBeforeInstallPrompt(event: Event): void {
  event.preventDefault();
  deferredPrompt = event as BeforeInstallPromptEvent;
  notify();
}

function onAppInstalled(): void {
  installed = true;
  deferredPrompt = null;
  notify();
}

// Register at module evaluation time, before React mounts and before SPA navigation.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
  window.addEventListener('appinstalled', onAppInstalled);
}

export function getPwaInstallSnapshot(): PwaInstallSnapshot {
  return {¶»§q«^