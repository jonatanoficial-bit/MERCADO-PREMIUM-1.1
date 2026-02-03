/*
  pwa.js
  Registro básico de Service Worker para PWA.
*/
(() => {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', async () => {
    try {
      await navigator.serviceWorker.register('./sw.js');
      // console.log('SW registrado');
    } catch (e) {
      console.warn('Falha ao registrar SW:', e);
    }
  });
})();