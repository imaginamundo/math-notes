function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./js/serviceWorker.js').catch(() => {});
  }
}

export default registerServiceWorker;
