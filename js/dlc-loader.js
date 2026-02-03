/* dlc-loader.js (COMPLETO) */

const DlcLoader = (() => {
  let manifest = [];
  const expansions = {};

  const KEYS = {
    DLC_MANIFEST: 'dlcManifest',
    DLC_DATA_PREFIX: 'dlc_',
    LICENSE_ACTIVE: 'licenseActive',
    LICENSE_KEY: 'licenseKey',
  };

  function isLicenseActive() {
    return localStorage.getItem(KEYS.LICENSE_ACTIVE) === 'true';
  }

  function getLicenseInfo() {
    const active = isLicenseActive();
    const key = localStorage.getItem(KEYS.LICENSE_KEY) || '';
    return { active, key };
  }

  function setLicenseActive(active, key = '') {
    localStorage.setItem(KEYS.LICENSE_ACTIVE, active ? 'true' : 'false');
    if (key) localStorage.setItem(KEYS.LICENSE_KEY, key);
  }

  function isEntryLocked(entry) {
    if (!entry) return false;
    const tier = entry.tier || 'free';
    if (tier !== 'premium') return false;
    return !isLicenseActive();
  }

  async function loadManifest() {
    try {
      const response = await fetch('dlc/manifest.json');
      if (response.ok) {
        manifest = await response.json();
      }
    } catch (err) {
      console.error('Falha ao carregar manifesto de DLC:', err);
      manifest = [];
    }

    const stored = localStorage.getItem(KEYS.DLC_MANIFEST);
    if (stored) {
      try {
        const storedManifest = JSON.parse(stored);
        storedManifest.forEach((entry) => {
          const idx = manifest.findIndex((m) => m.id === entry.id);
          if (idx >= 0) manifest[idx] = entry;
          else manifest.push(entry);
        });
      } catch (e) {
        console.warn('Manifesto no localStorage inválido. Ignorando.', e);
      }
    }
  }

  async function loadActiveExpansions() {
    Object.keys(expansions).forEach((k) => delete expansions[k]);

    for (const entry of manifest) {
      if (!entry.active) continue;

      if (isEntryLocked(entry)) {
        // DLC premium bloqueada: ignora carregamento
        continue;
      }

      const key = `${KEYS.DLC_DATA_PREFIX}${entry.id}`;
      const storedData = localStorage.getItem(key);
      if (storedData) {
        try {
          expansions[entry.id] = JSON.parse(storedData);
          continue;
        } catch (e) {
          console.warn(`Dados de DLC ${entry.id} corrompidos. Tentando arquivo.`);
        }
      }

      try {
        const res = await fetch(`dlc/${entry.file}`);
        if (res.ok) expansions[entry.id] = await res.json();
      } catch (err) {
        console.error(`Erro ao carregar DLC ${entry.id}:`, err);
      }
    }
  }

  async function init() {
    await loadManifest();
    await loadActiveExpansions();
  }

  function getManifest() {
    return manifest;
  }

  function setManifest(newManifest) {
    manifest = newManifest;
    localStorage.setItem(KEYS.DLC_MANIFEST, JSON.stringify(manifest));
  }

  function getAdditionalItems() {
    const items = [];
    for (const id in expansions) {
      const exp = expansions[id];
      if (exp && Array.isArray(exp.items)) items.push(...exp.items);
    }
    return items;
  }

  async function setActive(id, active) {
    const idx = manifest.findIndex((m) => m.id === id);
    if (idx < 0) return;

    const entry = manifest[idx];
    if (active && isEntryLocked(entry)) {
      // tentar ativar premium sem licença não pode
      return { ok: false, reason: 'locked' };
    }

    manifest[idx].active = !!active;
    setManifest([...manifest]);
    await loadActiveExpansions();
    return { ok: true };
  }

  function installExpansion(expansionData, manifestEntry) {
    const id = manifestEntry.id || `dlc_${Date.now()}`;
    manifestEntry.id = id;
    manifestEntry.file = manifestEntry.file || `${id}.json`;
    manifestEntry.version = manifestEntry.version || '1.0.0';
    manifestEntry.tier = manifestEntry.tier || 'free';
    manifestEntry.priceBRL = Number(manifestEntry.priceBRL || 0);

    localStorage.setItem(`${KEYS.DLC_DATA_PREFIX}${id}`, JSON.stringify(expansionData));
    manifest.push(manifestEntry);
    setManifest([...manifest]);
  }

  function removeExpansion(id) {
    const idx = manifest.findIndex((m) => m.id === id);
    if (idx >= 0) {
      manifest.splice(idx, 1);
      localStorage.removeItem(`${KEYS.DLC_DATA_PREFIX}${id}`);
      setManifest([...manifest]);
      delete expansions[id];
    }
  }

  function exportState() {
    const data = {
      manifest,
      expansions: {},
      lists: JSON.parse(localStorage.getItem('shoppingLists') || '[]'),
      license: getLicenseInfo(),
    };

    manifest.forEach((entry) => {
      const k = `${KEYS.DLC_DATA_PREFIX}${entry.id}`;
      const stored = localStorage.getItem(k);
      if (stored) data.expansions[entry.id] = JSON.parse(stored);
    });

    return data;
  }

  function importState(data) {
    if (data.manifest && Array.isArray(data.manifest)) {
      manifest = data.manifest;
      localStorage.setItem(KEYS.DLC_MANIFEST, JSON.stringify(manifest));
    }
    if (data.expansions && typeof data.expansions === 'object') {
      Object.keys(data.expansions).forEach((id) => {
        localStorage.setItem(`${KEYS.DLC_DATA_PREFIX}${id}`, JSON.stringify(data.expansions[id]));
      });
    }
    if (data.lists) {
      localStorage.setItem('shoppingLists', JSON.stringify(data.lists));
    }
    if (data.license && typeof data.license === 'object') {
      setLicenseActive(!!data.license.active, data.license.key || '');
    }
  }

  return {
    init,
    getManifest,
    setManifest,
    getAdditionalItems,
    setActive,
    installExpansion,
    removeExpansion,
    exportState,
    importState,
    isLicenseActive,
    setLicenseActive,
    getLicenseInfo,
    isEntryLocked,
  };
})();