import { supabase } from './supabase';

const PUSH_WORKER_URL =
  'https://uhbyruktnhktjeuqsqut.supabase.co/functions/v1/avelixa-push-worker';

interface PushSubscriptionResponse {
  publicKey?: string;
  error?: string;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

async function getVapidPublicKey(): Promise<string> {
  const response = await fetch(PUSH_WORKER_URL, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  const rawText = await response.text();
  let data: PushSubscriptionResponse = {};

  try {
    data = JSON.parse(rawText) as PushSubscriptionResponse;
  } catch {
    throw new Error(`Avelixa push worker returned an invalid response (${response.status}).`);
  }

  if (!response.ok) {
    throw new Error(data.error || `Avelixa push worker returned HTTP ${response.status}.`);
  }

  if (!data.publicKey) {
    throw new Error('Avelixa push worker did not return a VAPID public key.');
  }

  return data.publicKey;
}

async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new Error(`Unable to read the current Avelixa account: ${error.message}`);
  }

  if (!user) {
    throw new Error('You must be signed in to enable Avelixa notifications.');
  }

  return user;
}

async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
  if (!('serviceWorker' in navigator)) {
    throw new Error('This browser does not support service workers.');
  }

  const registrations = await navigator.serviceWorker.getRegistrations();
  const avelixaRegistration = registrations.find((registration) => {
    const scriptUrl =
      registration.active?.scriptURL ||
      registration.waiting?.scriptURL ||
      registration.installing?.scriptURL ||
      '';
    return scriptUrl.includes('/sw.js');
  });

  if (avelixaRegistration) {
    return avelixaRegistration.active
      ? avelixaRegistration
      : await navigator.serviceWorker.ready;
  }

  const rootRegistration = await navigator.serviceWorker.getRegistration('/');
  if (rootRegistration) {
    return rootRegistration.active
      ? rootRegistration
      : await navigator.serviceWorker.ready;
  }

  try {
    await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      type: 'module',
    });
    return await navigator.serviceWorker.ready;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Avelixa service worker registration failed: ${message}`);
  }
}

export async function isPushNotificationSupported(): Promise<boolean> {
  return isPushSupported();
}

export async function getPushPermission(): Promise<NotificationPermission | null> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return null;
  }

  return Notification.permission;
}

export async function requestPushNotificationPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) {
    throw new Error('Push notifications are not supported by this browser.');
  }

  return Notification.requestPermission();
}

export async function subscribeToAvelixaPushNotifications(): Promise<PushSubscription | null> {
  if (!isPushSupported()) {
    throw new Error('Push notifications are not supported by this browser.');
  }

  const user = await getCurrentUser();
  let permission = Notification.permission;

  if (permission !== 'granted') {
    permission = await requestPushNotificationPermission();
  }

  if (permission !== 'granted') {
    if (permission === 'denied') {
      throw new Error(
        'Notification permission was denied. Please allow notifications for Avelixa in your browser settings.'
      );
    }

    return null;
  }

  const registration = await getServiceWorkerRegistration();
  const activeRegistration = registration.active
    ? registration
    : await navigator.serviceWorker.ready;

  let subscription = await activeRegistration.pushManager.getSubscription();

  if (!subscription) {
    const publicKey = await getVapidPublicKey();
    subscription = await activeRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  const subscriptionJson = subscription.toJSON();

  if (!subscriptionJson.endpoint || !subscriptionJson.keys?.p256dh || !subscriptionJson.keys?.auth) {
    throw new Error('The browser created an incomplete Avelixa push subscription.');
  }

  const { error: subscriptionError } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        user_id: user.id,
        endpoint: subscriptionJson.endpoint,
        p256dh: subscriptionJson.keys.p256dh,
        auth: subscriptionJson.keys.auth,
        expiration_time: subscription.expirationTime
          ? new Date(subscription.expirationTime).toISOString()
          : null,
        user_agent: navigator.userAgent,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,endpoint' },
    );

  if (subscriptionError) {
    throw new Error(`Avelixa could not save this device subscription: ${subscriptionError.message}`);
  }

  const { error: preferenceError } = await supabase
    .from('notification_preferences')
    .upsert(
      {
        user_id: user.id,
        push_notifications: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );

  if (preferenceError) {
    console.warn(
      'Avelixa push subscription was saved, but notification preferences could not be updated:',
      preferenceError,
    );
  }

  return subscription;
}

export async function unsubscribeFromAvelixaPushNotifications(): Promise<void> {
  if (!isPushSupported()) {
    return;
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    return;
  }

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();

  const { error: subscriptionError } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', endpoint);

  if (subscriptionError) {
    console.error('Unable to remove Avelixa push subscription:', subscriptionError);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { error: preferenceError } = await supabase
      .from('notification_preferences')
      .upsert(
        {
          user_id: user.id,
          push_notifications: false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      );

    if (preferenceError) {
      console.error('Unable to update Avelixa notification preferences:', preferenceError);
    }
  }
}

export async function initializeAvelixaPushNotifications(): Promise<{
  supported: boolean;
  permission: NotificationPermission | null;
  subscribed: boolean;
}> {
  if (!isPushSupported()) {
    throw new Error('This browser does not support Avelixa push notifications.');
  }

  let permission = Notification.permission;

  if (permission !== 'granted') {
    permission = await requestPushNotificationPermission();
  }

  if (permission !== 'granted') {
    throw new Error(
      permission === 'denied'
        ? 'Notification permission was denied. Please allow notifications for Avelixa in browser settings.'
        : 'Notification permission was not granted.',
    );
  }

  const subscription = await subscribeToAvelixaPushNotifications();

  if (!subscription) {
    throw new Error('Avelixa could not create a push subscription for this device.');
  }

  return {
    supported: true,
    permission: 'granted',
    subscribed: true,
  };
}
