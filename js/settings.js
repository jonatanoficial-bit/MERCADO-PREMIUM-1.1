/*
  settings.js
  Gerencia preferências locais (modo sênior).
*/
const Settings = (() => {
  const KEY_SENIOR = 'app_seniorMode';

  function isSenior() {
    return localStorage.getItem(KEY_SENIOR) === 'true';
  }

  function applySenior(value) {
    localStorage.setItem(KEY_SENIOR, value ? 'true' : 'false');
    document.body.classList.toggle('mode-senior', value);
    document.dispatchEvent(new CustomEvent('settings:changed'));
  }

  function init() {
    applySenior(isSenior());
  }

  return { init, isSenior, applySenior };
})();