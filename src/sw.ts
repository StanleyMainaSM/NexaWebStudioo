/// <reference lib="webworker" />

import {
  cleanupOutdatedCaches,
  precacheAndRoute,
} from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{
    url: string;
    revision: string | null;
  }>;
};

cleanupOutdatedCaches();

precacheAndRoute(
  self.__WB_MANIFEST
);

self.addEventListener(
  'push',
  (event) => {
    if (!event.data) {
      return;
    }

    let data: {
      title?: string;
      body?: string;
      url?: string;
      notificationId?: string;
      type?: string;
      metadata?: Record<
        string,
        unknown
      >;
    };

    try {
      data =
        event.data.json();
    } catch {
      data = {
        title: 'Avelixa',
        body:
          event.data.text() ||
          'You have a new Avelixa notification.',
      };
    }

    // Keep message notifications private on lock screens regardless of
    // notification row contents. Detailed previews are not sent by default.
    const isMessage = data.type === 'message';
    const title = 'Avelixa';
    const body = isMessage
      ? 'You have a new message on Avelixa.'
      : 'You have a new notification on Avelixa.';

    const url = isMessage
      ? (typeof data.metadata?.conversation_id === 'string'
          ? `/portal/messages?conversation=${encodeURIComponent(data.metadata.conversation_id)}`
          : '/portal/messages')
      : (data.url || '/portal');

    const options: NotificationOptions =
      {
        body,
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag:
          data.notificationId ||
          `avelixa-${Date.now()}`,
        data: {
          url,
          notificationId:
            data.notificationId,
          type: data.type,
          metadata:
            data.metadata || {},
        },
      };

    event.waitUntil(
      self.registration.showNotification(
        title,
        options
      )
    );
  }
);

self.addEventListener(
  'notificationclick',
  (event) => {
    event.notification.close();

    const notificationData =
      event.notification.data as
        | {
            url?: string;
          }
        | undefined;

    const rawTargetUrl = notificationData?.url || '/portal';
    let targetUrl = '/portal';
    try {
      const candidate = new URL(rawTargetUrl, self.location.origin);
      // Notifications may only navigate within Avelixa's portal routes.
      if (
        candidate.origin === self.location.origin &&
        (candidate.pathname === '/portal' || candidate.pathname.startsWith('/portal/'))
      ) {
        targetUrl = candidate.pathname + candidate.search + candidate.hash;
      }
    } catch {
      targetUrl = '/portal';
    }

    event.waitUntil(
      (async () => {
        const clientList =
          await self.clients.matchAll({
            type: 'window',
            includeUncontrolled: true,
          });

        for (const client of clientList) {
          if (
            'focus' in client
          ) {
            try {
              await client.navigate(
                new URL(
                  targetUrl,
                  self.location.origin
                ).href
              );
            } catch {
              // Ignore navigation errors
            }

            await client.focus();

            return;
          }
        }

        if (
          self.clients.openWindow
        ) {
          await self.clients.openWindow(
            new URL(
              targetUrl,
              self.location.origin
            ).href
          );
        }
      })()
    );
  }
);

self.addEventListener(
  'notificationclose',
  () => {
    // Reserved for future analytics.
  }
);