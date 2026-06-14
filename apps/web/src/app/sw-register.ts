export const registerServiceWorker = async () => {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });
    console.info("Service Worker registered:", registration.scope);
  } catch (error) {
    console.error("Service Worker registration failed:", error);
  }
};
