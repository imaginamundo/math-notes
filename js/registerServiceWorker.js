function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./js/serviceWorker.js')
      .then(registration => {
        registration.addEventListener('updatefound', () => {
          console.log(
            'A new service worker is being installed:',
            registration.installing
          );
        });
        console.log('ServiceWorker registration successful');
      })
      .catch(error => {
        console.log('ServiceWorker registration failed: ', error);
      });
  }
}

export default registerServiceWorker;