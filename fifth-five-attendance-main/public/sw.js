self.addEventListener('push', (event) => {
  let data = { title: '5th-5M Student Portal', body: 'You have a new notification.', icon: '/icon-192.svg', badge: '/icon-192.svg', url: '/portal' };
  try { if (event.data) data = { ...data, ...event.data.json() }; } catch (_) {}
  event.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    data: { url: data.url || '/portal' },
    vibrate: [120, 60, 120],
  }));
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/portal';
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    const existing = list.find((c) => 'focus' in c);
    if (existing) { existing.navigate(url); return existing.focus(); }
    return clients.openWindow(url);
  }));
});
