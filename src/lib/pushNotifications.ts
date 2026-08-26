import { supabase } from './supabase';

const PUSH_WORKER_URL =
  'https://uhbyruktnhktjeuqsqut.supabase.co/functions/v1/avelixa-push-worker';

interface PushSubscriptionResponse {
  publicKey?: string;
}

function urlBase64ToUint8Array(
  base64String: string
): Uint8Array {
  const padding =
    '='.repeat(
      (4 - (base64String.length % 4)) % 4
    );

  const base64 = (
    base64String +
    padding
  )
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);

  return Uint8Array.from(
    [...rawData].map((char) =>
      char.charCodeAt(0)
    )
  );
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
  const response = await fetch(
    PUSH_WORKER_URL,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(
      `Unable to load Avelixa push configuration (${response.status}).`
    );
  }

  const data =
    (await response.json()) as PushSubscriptionResponse;

  if (!data.publicKey) {
    throw new Error(
      'Avelixa push public key is unavailable.'
    );
  }

  return data.publicKey;
}

async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  if (!user) {
    throw new Error(
      'You must be signed in to enable Avelixa notifications.'
    );
  }

  return user;
}

async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
  if (!('serviceWorker' in navigator)) {
    throw new Error(
      'Service workers are not supported by this browser.'
    );
  }

  const existingRegistration =
    await navigator.serviceWorker.getRegistration(
      '/'
    );

  if (existingRegistration) {
    return existingRegistration;
  }

  return navigator.serviceWorker.ready;
}

export async function isPushNotificationSupported(): Promise<boolean> {
  return isPushSupported();
}

export async function getPushPermission(): Promise<NotificationPermission | null> {
  if (
    typeof window === 'undefined' ||
    !('Notification' in window)
  ) {
    return null;
  }

  return Notification.permission;
}

export async function requestPushNotificationPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) {
    throw new Error(
      'Push notifications are not supported by this browser.'
    );
  }

  return Notification.requestPermission();
}

export async function subscribeToAvelixaPushNotifications(): Promise<PushSubscription | null> {
  if (!isPushSupported()) {
    return null;
  }

  const user = await getCurrentUser();

  const permission =
    await requestPushNotificationPermission();

  if (permission !== 'granted') {
    return null;
  }

  const registration =
    await getServiceWorkerRegistration();

  let subscription =
    await registration.pushManager.getSubscription();

  if (!subscription) {
    const publicKey =
      await getVapidPublicKey();

    subscription =
      await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey:
          urlBase64ToUint8Array(
            publicKey
          ),
      });
  }

  const subscriptionJson =
    subscription.toJSON();

  if (
    !subscriptionJson.endpoint ||
    !subscriptionJson.keys?.p256dh ||
    !subscriptionJson.keys?.auth
  ) {
    throw new Error(
      'The browser returned an incomplete push subscription.'
    );
  }

  const { error } =
    await supabase
      .from('push_subscriptions')
      .upsert(
        {
          user_id: user.id,
          endpoint:
            subscriptionJson.endpoint,
          p256dh:
            subscriptionJson.keys.p256dh,
          auth:
            subscriptionJson.keys.auth,
          expiration_time:
            subscription.expirationTime
              ? new Date(
                  subscription.expirationTime
                ).toISOString()
              : null,
          user_agent:
            navigator.userAgent,
          updated_at:
            new Date().toISOString(),
        },
        {
          onConflict:
            'user_id,endpoint',
        }
      );

  if (error) {
    throw error;
  }

  await supabase
    .from('notification_preferences')
    .upsert(
      {
        user_id: user.id,
        push_notifications: true,
        updated_at:
          new Date().toISOString(),
      },
      {
        onConflict: 'user_id',
      }
    );

  return subscription;
}

export async function unsubscribeFromAvelixaPushNotifications(): Promise<void> {
  if (!isPushSupported()) {
    return;
  }

  const subscription =
    await navigator.serviceWorker.ready
      .then((registration) =>
        registration.pushManager.getSubscription()
      );

  if (!subscription) {
    return;
  }

  const endpoint =
    subscription.endpoint;

  await subscription.unsubscribe();

  await supabase
    .from('push_subscriptions')
    .delete()
    .eq(
      'endpoint',
      endpoint
    );
}

export async function initializeAvelixaPushNotifications(): Promise<{
  supported: boolean;
  permission: NotificationPermission | null;
  subscribed: boolean;
}> {
  if (!isPushSupported()) {
    return {
      supported: false,
      permission: null,
      subscribed: false,
    };
  }

  const permission =
    Notification.permission;

  if (permission !== 'granted') {
    return {
      supported: true,
      permission,
      subscribed: false,
    };
  }

  try {
    const subscription =
      await subscribeToAvelixaPushNotifications();

    return {
      supported: true,
      permission,
      subscribed:
        subscription !== null,
    };
  } catch (error) {
    console.error(
      'Avelixa push initialization error:',
      error
    );

    return {
      supported: true,
      permission,
      subscribed: false,
    };
  }
}