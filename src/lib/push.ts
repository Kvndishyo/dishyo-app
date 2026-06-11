import { VAPID_PUBLIC_KEY, urlBase64ToUint8Array } from "./push-config";
import { savePushSubscription, removePushSubscription } from "./push.functions";

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  const reg = await navigator.serviceWorker.register("/push-sw.js", { scope: "/" });
  await navigator.serviceWorker.ready;
  return reg;
}

export async function getCurrentPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  try {
    const reg = await getRegistration();
    return await reg.pushManager.getSubscription();
  } catch {
    return null;
  }
}

export async function enablePush(): Promise<{ ok: boolean; reason?: string }> {
  if (!isPushSupported()) return { ok: false, reason: "Navigateur non compatible" };
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return { ok: false, reason: "Permission refusée" };

  const reg = await getRegistration();
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
    });
  }


  const json = sub.toJSON();
  await savePushSubscription({
    data: {
      endpoint: sub.endpoint,
      p256dh: json.keys?.p256dh ?? "",
      auth: json.keys?.auth ?? "",
      user_agent: navigator.userAgent.slice(0, 500),
    },
  });
  return { ok: true };
}

export async function disablePush(): Promise<void> {
  if (!isPushSupported()) return;
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    try {
      await removePushSubscription({ data: { endpoint: sub.endpoint } });
    } catch {
      /* ignore */
    }
    await sub.unsubscribe();
  }
}
