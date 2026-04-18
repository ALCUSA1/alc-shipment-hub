import { Capacitor } from "@capacitor/core";

export const isNative = () => Capacitor.isNativePlatform();
export const platform = () => Capacitor.getPlatform(); // 'ios' | 'android' | 'web'

/** Geolocation — driver live location */
export async function getCurrentPosition() {
  if (!isNative()) {
    return new Promise<GeolocationPosition>((resolve, reject) =>
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
      })
    );
  }
  const { Geolocation } = await import("@capacitor/geolocation");
  await Geolocation.requestPermissions();
  return Geolocation.getCurrentPosition({ enableHighAccuracy: true });
}

export async function watchPosition(
  cb: (lat: number, lng: number, accuracy: number) => void
) {
  if (!isNative()) {
    const id = navigator.geolocation.watchPosition(
      (p) => cb(p.coords.latitude, p.coords.longitude, p.coords.accuracy),
      console.error,
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(id);
  }
  const { Geolocation } = await import("@capacitor/geolocation");
  await Geolocation.requestPermissions();
  const id = await Geolocation.watchPosition(
    { enableHighAccuracy: true },
    (pos) => {
      if (pos) cb(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
    }
  );
  return () => Geolocation.clearWatch({ id });
}

/** Camera — POD photos */
export async function takePhoto(): Promise<string | null> {
  if (!isNative()) {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.capture = "environment";
      input.onchange = () => {
        const file = input.files?.[0];
        if (!file) return resolve(null);
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.readAsDataURL(file);
      };
      input.click();
    });
  }
  const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");
  const photo = await Camera.getPhoto({
    quality: 85,
    resultType: CameraResultType.DataUrl,
    source: CameraSource.Camera,
    allowEditing: false,
  });
  return photo.dataUrl ?? null;
}

/** Barcode scanner — container numbers */
export async function scanBarcode(): Promise<string | null> {
  if (!isNative()) {
    const value = window.prompt("Enter container/barcode number");
    return value?.trim() || null;
  }
  const mod: any = await import("@capacitor/barcode-scanner");
  const Scanner = mod.CapacitorBarcodeScanner ?? mod.BarcodeScanner ?? mod.default;
  const result = await Scanner.scanBarcode({ hint: 17 });
  return result?.ScanResult || null;
}

/** Push notifications — register and return device token */
export async function registerPushNotifications(
  onToken: (token: string) => void,
  onNotification?: (n: { title?: string; body?: string; data?: any }) => void
) {
  if (!isNative()) {
    console.info("[push] Web push not enabled in this build");
    return;
  }
  const { PushNotifications } = await import("@capacitor/push-notifications");
  let perm = await PushNotifications.checkPermissions();
  if (perm.receive === "prompt") perm = await PushNotifications.requestPermissions();
  if (perm.receive !== "granted") return;

  await PushNotifications.register();

  PushNotifications.addListener("registration", (t) => onToken(t.value));
  PushNotifications.addListener("registrationError", (e) =>
    console.error("[push] registration error", e)
  );
  if (onNotification) {
    PushNotifications.addListener("pushNotificationReceived", (n) =>
      onNotification({ title: n.title, body: n.body, data: n.data })
    );
    PushNotifications.addListener("pushNotificationActionPerformed", (a) =>
      onNotification({
        title: a.notification.title,
        body: a.notification.body,
        data: a.notification.data,
      })
    );
  }
}

/** Network status */
export async function getNetworkStatus() {
  if (!isNative()) {
    return { connected: navigator.onLine, connectionType: "unknown" };
  }
  const { Network } = await import("@capacitor/network");
  return Network.getStatus();
}
