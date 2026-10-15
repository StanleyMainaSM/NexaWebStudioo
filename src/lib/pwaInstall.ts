export type InstallPromptChoice = 'accepted' | 'dismissed';
export interface BeforeInstallPromptEvent extends Event { readonly platforms?: string[]; prompt(): Promise<void>; readonly userChoice: Promise<{ outcome: InstallPromptChoice; platform: string }>; }
export interface PwaInstallSnapshot { promptAvailable: boolean; installed: boolean; }
type Listener = () => void;
let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installed = isStandaloneDisplayMode();
const listeners = new Set<Listener>();
function isStandaloneDisplayMode(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)').matches === true || (typeof navigator !== 'undefined' && 'standalone' in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true);
}
function notify(): void { listeners.forEach((listener) => listener()); }
function onBeforeInstallPrompt(event: Event): void { event.preventDefault(); deferredPrompt = event as BeforeInstallPromptEvent; notify(); }
function onAppInstalled(): void { installed = true; deferredPrompt = null; notify(); }
// Register before React mounts so SPA navigation cannot miss the one-shot event.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
  window.addEventListener('appinstalled', onAppInstalled);
}
export function getPwaInstallSnapshot(): PwaInstallSnapshot { return { promptAvailable: deferredPrompt !== null, installed }; }
export function subscribePwaInstall(listener: Listener): () => void { listeners.add(listener); return () => listeners.delete(listener); }
export async function promptPwaInstall(): Promise<InstallPromptChoice | 'unavailable'> {
  const promptEvent = deferredPrompt;
  if (!promptEvent) return 'unavailable';
  deferredPrompt = null;
  notify();
  try {
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    // appinstalled, not userChoice alone, is the authoritative installed signal.
    if (choice.outcome === 'accepted') notify();
    return choice.outcome;
  } catch (error) { notify(); throw error; }
}
