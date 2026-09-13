function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./serviceWorker.js').catch(() => {});
  }
}

export default registerServiceWorker;
