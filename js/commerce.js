/*
  commerce.js
  Módulo comercial simples (local) pronto para evoluir para backend.

  Regras:
  - FREE: limite de 5 listas salvas e DLCs bloqueadas.
  - PRO: ilimitado + DLCs liberadas.
  - Código PRO local (placeholder): "VALE-PRO"
*/

const Commerce = (() => {
  const KEY = 'app_isPro';

  function isPro() {
    return localStorage.getItem(KEY) === 'true';
  }

  function setPro(value) {
    localStorage.setItem(KEY, value ? 'true' : 'false');
    document.dispatchEvent(new CustomEvent('commerce:changed'));
  }

  function tryActivateWithCode(code) {
    const normalized = String(code || '').trim().toUpperCase();
    if (normalized === 'VALE-PRO') {
      setPro(true);
      return { ok: true, message: 'PRO ativado com sucesso.' };
    }
    return { ok: false, message: 'Código inválido.' };
  }

  function limits() {
    if (isPro()) {
      return { maxSavedLists: Infinity, dlcAllowed: true };
    }
    return { maxSavedLists: 5, dlcAllowed: false };
  }

  return {
    isPro,
    setPro,
    tryActivateWithCode,
    limits,
  };
})();