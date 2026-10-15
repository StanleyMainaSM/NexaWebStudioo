import { useEffect, useState } from 'react';
import { BellRing, BellOff, Loader2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import {
  getPushPermission,
  isPushNotificationSupported,
  initializeAvelixaPushNotifications,
  unsubscribeFromAvelixaPushNotifications,
} from '../../lib/pushNotificationService';
import { supabase } from '../../lib/supabase';

type PushState = 'checking' | 'unsupported' | 'off' | 'on' | 'denied';

export default function PushNotificationSettings() {
  const { user } = useAuth();
  const [state, setState] = useState<PushState>('checking');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const refresh = async () => {
    if (!user?.id) {
      setState('off');
      return;
    }
    try {
      const supported = await isPushNotificationSupported();
      if (!supported) {
        setState('unsupported');
        return;
      }
      const permission = await getPushPermission();
      if (permission === 'denied') {
        setState('denied');
        return;
      }
      const registrations = await navigator.serviceWorker.getRegistrations();
      const registration = registrations.find((item) =>
        (item.active?.scriptURL || item.waiting?.scriptURL || '').includes('/sw.js'),
      ) || await navigator.serviceWorker.getRegistration('/');
      const subscription = await registration?.pushManager.getSubscription();
      if (permission === 'granted' && subscription) {
        const { data, error } = await supabase
          .from('push_subscriptions')
          .select('id')
          .eq('user_id', user.id)
          .eq('endpoint', subscription.endpoint)
          .maybeSingle();
        if (error) throw error;
        setState(data ? 'on' : 'off');
        return;
      }
      setState('off');
    } catch {
      setState('off');
    }
  };

  useEffect(() => {
    let alive = true;
    void refresh().finally(() => { if (!alive) return; });
    return () => { alive = false; };
  }, [user?.id]);

  const enable = async () => {
    setBusy(true);
    setMessage('');
    try {
      const result = await initializeAvelixaPushNotifications();
      if (result.subscribed) {
        setState('on');
        setMessage('Push notifications are enabled for this device.');
      } else {
        setState('off');
        setMessage('Notifications were not enabled.');
      }
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Avelixa could not enable notifications.';
      setMessage(text);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    setMessage('');
    try {
      await unsubscribeFromAvelixaPushNotifications();
      setState('off');
      setMessage('Push notifications have been disabled for this device.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Avelixa could not disable notifications.');
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="glass rounded-2xl border border-ink-800/50 p-6">
      <div className="flex items-center gap-3">
        {state === 'on' ? <BellRing className="h-5 w-5 text-emerald-400" /> : <BellOff className="h-5 w-5 text-accent-400" />}
        <h2 className="text-lg font-medium text-white">Device push notifications</h2>
      </div>
      <p className="mt-3 text-sm leading-6 text-gray-400">
        Get a private alert when a new message arrives, even when Avelixa is in the background.
        Message previews are not shown on your lock screen.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className={`rounded-full px-3 py-1 text-xs ${state === 'on' ? 'bg-emerald-500/10 text-emerald-300' : state === 'unsupported' ? 'bg-white/5 text-gray-400' : 'bg-white/5 text-gray-300'}`}>
          {state === 'checking' ? 'Checking this device…' : state === 'on' ? 'Enabled on this device' : state === 'unsupported' ? 'Not supported by this browser' : state === 'denied' ? 'Blocked in browser settings' : 'Disabled on this device'}
        </span>
        {state === 'on' ? (
          <button type="button" onClick={() => void disable()} disabled={busy || !user} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-gray-200 disabled:opacity-50">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Disable notifications
          </button>
        ) : (
          <button type="button" onClick={() => void enable()} disabled={busy || !user || state === 'checking' || state === 'unsupported' || state === 'denied'} className="inline-flex items-center gap-2 rounded-xl bg-accent-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4" />} Enable notifications
          </button>
        )}
      </div>
      {state === 'denied' && <p className="mt-3 text-xs text-amber-300">Allow notifications for Avelixa in your browser or device settings, then reload this page.</p>}
      {state === 'unsupported' && <p className="mt-3 text-xs text-gray-500">Use a supported browser. On iPhone or iPad, Web Push generally requires a compatible iOS/iPadOS version and Avelixa added to the Home Screen.</p>}
      {message && <p role="status" className="mt-3 text-sm text-gray-300">{message}</p>}
      <p className="mt-4 flex items-start gap-2 text-xs text-gray-500"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /> This setting applies only to this device. Other devices remain independently subscribed.</p>
    </section>
  );
}
