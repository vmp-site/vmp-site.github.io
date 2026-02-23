(() => {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });

  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    window.deferredInstallPrompt = deferredPrompt;

    const installButtons = document.querySelectorAll('[data-install-app]');
    installButtons.forEach((button) => {
      button.classList.remove('hidden');
      button.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        deferredPrompt = null;
        window.deferredInstallPrompt = null;
        button.classList.add('hidden');
      }, { once: true });
    });
  });
})();
