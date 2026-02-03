/* admin.js (COMPLETO) */

document.addEventListener('DOMContentLoaded', async () => {
  const el = {
    backBtn: document.getElementById('backBtn'),
    logoutBtn: document.getElementById('logoutBtn'),

    loginSection: document.getElementById('loginSection'),
    adminPanel: document.getElementById('adminPanel'),

    password: document.getElementById('adminPassword'),
    loginBtn: document.getElementById('loginBtn'),

    dlcList: document.getElementById('dlcList'),

    uploadDlcInput: document.getElementById('uploadDlcInput'),
    exportDataBtn: document.getElementById('exportDataBtn'),
    importDataInput: document.getElementById('importDataInput'),

    licenseStatus: document.getElementById('licenseStatus'),
    activateLicenseBtn: document.getElementById('activateLicenseBtn'),

    toast: document.getElementById('toast'),
  };

  const ADMIN_PASS_KEY = 'adminPassword';
  const ADMIN_LOGGED_KEY = 'adminLogged';

  function toast(msg) {
    el.toast.textContent = msg;
    el.toast.classList.add('show');
    window.clearTimeout(toast._t);
    toast._t = window.setTimeout(() => el.toast.classList.remove('show'), 2200);
  }

  function ensureDefaultPassword() {
    if (!localStorage.getItem(ADMIN_PASS_KEY)) localStorage.setItem(ADMIN_PASS_KEY, '1234');
  }

  function isLogged() {
    return localStorage.getItem(ADMIN_LOGGED_KEY) === 'true';
  }

  function setLogged(v) {
    localStorage.setItem(ADMIN_LOGGED_KEY, v ? 'true' : 'false');
  }

  function updateLicenseUI() {
    const info = DlcLoader.getLicenseInfo();
    el.licenseStatus.textContent = info.active ? `Ativada ✅ (${info.key || 'OK'})` : 'Não ativada';
  }

  function renderDLCs() {
    el.dlcList.innerHTML = '';

    const manifest = DlcLoader.getManifest();
    if (!manifest || manifest.length === 0) {
      el.dlcList.innerHTML = `<div class="microhelp">Nenhuma DLC encontrada.</div>`;
      return;
    }

    manifest.forEach((dlc) => {
      const locked = DlcLoader.isEntryLocked(dlc);
      const tier = dlc.tier || 'free';
      const price = Number(dlc.priceBRL || 0);

      const wrap = document.createElement('div');
      wrap.className = 'dlc-item';

      const badges = [];
      badges.push(`<span class="badge">${dlc.version || '1.0.0'}</span>`);
      if (tier === 'premium') badges.push(`<span class="badge premium">Premium • R$ ${price.toFixed(2)}</span>`);
      if (locked) badges.push(`<span class="badge locked">Bloqueada</span>`);

      wrap.innerHTML = `
        <div class="dlc-item-header">
          <div>
            <div class="dlc-item-title">${dlc.name}</div>
            <div class="dlc-item-desc">${dlc.description || ''}</div>
          </div>
          <div class="dlc-badges">${badges.join('')}</div>
        </div>

        <div class="dlc-item-actions">
          <label class="switch" title="Ativar/Desativar">
            <span>Ativo</span>
            <input type="checkbox" ${dlc.active ? 'checked' : ''} ${locked ? 'disabled' : ''}/>
          </label>

          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <button class="ghost-button btn-toggle-tier" type="button">
              ${tier === 'premium' ? 'Marcar Free' : 'Marcar Premium'}
            </button>

            <button class="danger-button btn-remove" type="button">
              Remover
            </button>
          </div>
        </div>
      `;

      const chk = wrap.querySelector('input[type="checkbox"]');
      chk.addEventListener('change', async (e) => {
        const res = await DlcLoader.setActive(dlc.id, e.target.checked);
        if (!res.ok && res.reason === 'locked') {
          e.target.checked = false;
          toast('DLC Premium bloqueada. Ative a licença.');
        } else {
          toast(e.target.checked ? 'DLC ativada' : 'DLC desativada');
        }
        renderDLCs();
      });

      wrap.querySelector('.btn-remove').addEventListener('click', () => {
        if (!confirm('Remover esta DLC?')) return;
        DlcLoader.removeExpansion(dlc.id);
        toast('DLC removida');
        renderDLCs();
      });

      wrap.querySelector('.btn-toggle-tier').addEventListener('click', () => {
        const m = DlcLoader.getManifest();
        const idx = m.findIndex(x => x.id === dlc.id);
        if (idx < 0) return;

        const cur = m[idx].tier || 'free';
        m[idx].tier = (cur === 'premium') ? 'free' : 'premium';
        if (m[idx].tier === 'free') m[idx].priceBRL = 0;
        if (m[idx].tier === 'premium' && !m[idx].priceBRL) m[idx].priceBRL = 9.9;

        // Se virou premium e não tem licença, não deixa ativo
        if (m[idx].tier === 'premium' && !DlcLoader.isLicenseActive()) m[idx].active = false;

        DlcLoader.setManifest(m);
        toast('Tipo de DLC atualizado');
        renderDLCs();
      });

      el.dlcList.appendChild(wrap);
    });
  }

  function showPanel() {
    el.loginSection.style.display = 'none';
    el.adminPanel.style.display = 'block';
    updateLicenseUI();
    renderDLCs();
  }

  function showLogin() {
    el.loginSection.style.display = 'block';
    el.adminPanel.style.display = 'none';
  }

  // Init
  ensureDefaultPassword();
  await DlcLoader.init();

  // Nav
  el.backBtn.addEventListener('click', () => window.location.href = 'index.html');

  el.logoutBtn.addEventListener('click', () => {
    setLogged(false);
    toast('Você saiu');
    showLogin();
  });

  // Login
  el.loginBtn.addEventListener('click', () => {
    const stored = localStorage.getItem(ADMIN_PASS_KEY) || '1234';
    if (el.password.value === stored) {
      setLogged(true);
      toast('Login OK');
      showPanel();
    } else {
      el.password.classList.add('input-error');
      setTimeout(() => el.password.classList.remove('input-error'), 700);
      toast('Senha incorreta');
    }
  });

  // Licença
  el.activateLicenseBtn.addEventListener('click', () => {
    const key = prompt('Digite a chave da licença Premium:', '');
    if (!key) return;

    // Validação simples local (fácil trocar por backend depois)
    // Chave aceita: PREMIUM-2026
    if (key.trim().toUpperCase() === 'PREMIUM-2026') {
      DlcLoader.setLicenseActive(true, key.trim().toUpperCase());
      toast('Licença ativada ✅');
    } else {
      DlcLoader.setLicenseActive(false, '');
      toast('Chave inválida');
    }
    updateLicenseUI();
    renderDLCs();
  });

  // Upload DLC
  el.uploadDlcInput.addEventListener('change', async () => {
    const file = el.uploadDlcInput.files?.[0];
    el.uploadDlcInput.value = '';
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      const name = prompt('Nome da DLC:', file.name.replace('.json','')) || 'Nova DLC';
      const tier = (prompt('Tipo: free ou premium?', 'free') || 'free').toLowerCase() === 'premium' ? 'premium' : 'free';
      const priceBRL = tier === 'premium' ? Number(prompt('Preço (R$):', '9.90') || '9.90') : 0;

      const entry = {
        id: `dlc_${Date.now()}`,
        name,
        version: '1.0.0',
        description: 'DLC instalada pelo Admin',
        active: false,
        file: `${Date.now()}.json`,
        tier,
        priceBRL,
      };

      DlcLoader.installExpansion(data, entry);
      toast('DLC instalada');
      renderDLCs();
    } catch (e) {
      console.error(e);
      toast('Falha ao instalar DLC (JSON inválido)');
    }
  });

  // Export/Import
  el.exportDataBtn.addEventListener('click', () => {
    const data = DlcLoader.exportState();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type:'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'backup-lista-compras.json';
    a.click();
    URL.revokeObjectURL(url);
    toast('Backup exportado');
  });

  el.importDataInput.addEventListener('change', async () => {
    const file = el.importDataInput.files?.[0];
    el.importDataInput.value = '';
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      DlcLoader.importState(data);
      await DlcLoader.init();
      toast('Backup importado');
      updateLicenseUI();
      renderDLCs();
    } catch (e) {
      console.error(e);
      toast('Falha ao importar (JSON inválido)');
    }
  });

  // Auto login
  if (isLogged()) showPanel();
  else showLogin();
});