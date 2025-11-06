export {};

declare global {
  interface Window {
    swRegistration?: ServiceWorkerRegistration;
  }
}
