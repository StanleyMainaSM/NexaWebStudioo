export type InstallPromptChoice = 'accepted' | 'dismissed';
export interface BeforeInstallPromptEvent extends Event { readonly platforms?: string[]; prompt(): Promise<void>; readonly userChoice: Promise<{ outcome: InstallPromptChoice; platform: string }>; }
export interface PwaInstallSnapshot { promptAvailable: boolean; installed: boolean; }
type Listener = () => void;

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installed = isStandaloneDisplayMode();
const listeners = new Set<Listener>();
const diagnosticState = {
  eventEverReceived: false,
  eventRetained: false,
  eventReceivedAt: null as string | null,
  promptCalledAt: null as string | null,
  promptOutcome: null as InstallPromptChoice | null,
  appInstalledAt: null as string | null,
};

function isStandaloneDisplayMode(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(display-mode: standalone)').matches === true || (typeof navigator !== 'undefined' && 'standalone' in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true);
}

function diagnosticsEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  const developmentBuild = (import.meta as ImportMeta & { env?: { DEV?: boolean } }).env?.DEV === true;
  const explicitlyOptedIn = new URLSearchParams(window.location?.search ?? '').get('pwaDebug') === '1';
  return developmentBuild || explicitlyOptedIn;
}

function diagnostic(event: string, details: Record<string, unknown> = {}): void {
  if (!diagnosticsEnabled()) return;
  // Deliberately log only install lifecycle and capability state; never user/account data.
  console.info('[Avelixa PWA diagnostic]', {
    at: new Date().toISOString(),
    event,
    origin: typeof window === 'undefined' ? null : window.location?.origin ?? null,
    eventEverReceived: diagnosticState.eventEverReceived,
    eventRetained: deferredPrompt !== null,
    installed,
    displayModeStandalone: typeof window !== 'undefined' && window.matchMedia?.('(display-mode: standalone)').matches === true,
    navigatorStandalone: typeof navigator !== 'undefined' && 'standalone' in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true,
    ...details,
  });
}

async function inspectInstallEnvironment(): Promise<void> {
  if (typeof window === 'undefined') return;
  diagnostic('diagnostic-start', {
    secureContext: window.isSecureContext,
    beforeInstallPromptSupport: 'onbeforeinstallprompt' in window,
    serviceWorkerSupported: 'serviceWorker' in navigator,
  });

  try {
    const response = await fetch('/manifest.webmanifest', { cache: 'no-store' });
    let manifestDetails: Record<string, unknown> = { status: response.status, ok: response.ok, contentType: response.headers.get('content-type') };
    if (response.ok) {
      try {
        const manifest = await response.json() as { name?: string; short_name?: string; start_url?: string; scope?: string; display?: string; icons?: unknown[] };
        manifestDetails = { ...manifestDetails, name: manifest.name ?? null, shortName: manifest.short_name ?? null, startUrl: manifest.start_url ?? null, scope: manifest.scope ?? null, display: manifest.display ?? null, iconCount: Array.isArray(manifest.icons) ? manifest.icons.length : 0 };
      } catch {
        manifestDetails = { ...manifestDetails, parseable: false };
      }
    }
    diagnostic('manifest-check', manifestDetails);
  } catch (error) {
    diagnostic('manifest-check-failed', { errorName: error instanceof Error ? error.name : 'UnknownError' });
  }

  if (!('serviceWorker' in navigator)) {
    diagnostic('service-worker-status', { supported: false, ready: false });
    return;
  }
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    diagnostic('service-worker-registration', {
      supported: true,
      registered: Boolean(registration),
      activeState: registration?.active?.state ?? null,
      installingState: registration?.installing?.state ?? null,
      waitingState: registration?.waiting?.state ?? null,
      controllerState: navigator.serviceWorker.controller?.state ?? null,
    });
    void navigator.serviceWorker.ready.then((readyRegistration) => {
      diagnostic('service-worker-ready', {
        ready: true,
        activeState: readyRegistration.active?.state ?? null,
        scope: readyRegistration.scope,
      });
    }).catch((error: unknown) => {
      diagnostic('service-worker-ready-failed', { errorName: error instanceof Error ? error.name : 'UnknownError' });
    });
  } catch (error) {
    diagnostic('service-worker-registration-check-failed', { errorName: error instanceof Error ? error.name : 'UnknownError' });
  }
}

function notify(): void {
  diagnostic('install-state-subscribers-notified', { promptAvailable: deferredPrompt !== null, subscriberCount: listeners.size });
  listeners.forEach((listener) => listener());
}

function onBeforeInstallPrompt(event: Event): void {
  diagnosticState.eventEverReceived = true;
  diagnosticState.eventReceivedAt = new Date().toISOString();
  diagnostic('beforeinstallprompt-received', { cancelable: event.cancelable });
  event.preventDefault();
  deferredPrompt = event as BeforeInstallPromptEvent;
  diagnosticState.eventRetained = true;
  diagnostic('beforeinstallprompt-prevented-and-retained', { defaultPrevented: event.defaultPrevented, retainedAt: diagnosticState.eventReceivedAt });
  notify();
}

function onAppInstalled(): void {
  installed = true;
  deferredPrompt = null;
  diagnosticState.eventRetained = false;
  diagnosticState.appInstalledAt = new Date().toISOString();
  diagnostic('appinstalled-event');
  notify();
}

// Register before React mounts so SPA navigation cannot miss the one-shot event.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
  window.addEventListener('appinstalled', onAppInstalled);
  void inspectInstallEnvironment();
  diagnostic('initial-install-state', {
    eventReceivedSoFar: diagnosticState.eventEverReceived,
    installEventStatus: 'No beforeinstallprompt event received in this document so far; this is not proof that Edge will never emit it.',
  });
}

export function getPwaInstallSnapshot(): PwaInstallSnapshot { return { promptAvailable: deferredPrompt !== null, installed }; }

export function subscribePwaInstall(listener: Listener): () => void {
  listeners.add(listener);
  diagnostic('install-state-subscriber-added', { promptAvailable: deferredPrompt !== null, subscriberCount: listeners.size });
  return () => listeners.delete(listener);
}

export async function promptPwaInstall(): Promise<InstallPromptChoice | 'unavailable'> {
  diagnostic('promptPwaInstall-entered', {
    retainedEventAtButtonClick: deferredPrompt !== null,
    eventEverReceived: diagnosticState.eventEverReceived,
    classification: installed ? 'E: app already installed or running standalone' : deferredPrompt ? 'A: event received and retained at click' : diagnosticState.eventEverReceived ? 'C: event was received earlier but no retained event exists at click' : 'B: no event received in this document so far',
  });
  const promptEvent = deferredPrompt;
  if (!promptEvent) return 'unavailable';
  deferredPrompt = null;
  diagnosticState.eventRetained = false;
  notify();
  try {
    // Keep prompt() in the direct user-gesture call stack; diagnostics must not await first.
    diagnosticState.promptCalledAt = new Date().toISOString();
    diagnostic('native-prompt-call', { retainedEventImmediatelyBeforePrompt: promptEvent !== null });
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    diagnosticState.promptOutcome = choice.outcome;
    diagnostic('native-prompt-outcome', { outcome: choice.outcome, platform: choice.platform || null });
    // appinstalled, not userChoice alone, is the authoritative installed signal.
    if (choice.outcome === 'accepted') notify();
    return choice.outcome;
  } catch (error) {
    diagnostic('native-prompt-failed', { errorName: error instanceof Error ? error.name : 'UnknownError' });
    notify();
    throw error;
  }
}
