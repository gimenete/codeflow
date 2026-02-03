export function requestNotificationPermission(): void {
  if (
    typeof Notification !== "undefined" &&
    Notification.permission === "default"
  ) {
    void Notification.requestPermission();
  }
}

export function showNotification(
  title: string,
  body: string,
  onClick?: () => void,
): void {
  if (
    typeof Notification === "undefined" ||
    Notification.permission !== "granted"
  ) {
    return;
  }

  const notification = new Notification(title, { body });
  if (onClick) {
    notification.onclick = () => {
      onClick();
      notification.close();
    };
  }
}
