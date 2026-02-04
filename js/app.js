/* ============================================================================
 * js/app.js (COMPLETO)
 * Splash VALE GAMES (não trava) + Lista + PDF + DLC safe + PWA
 * ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  // ===== SPLASH =====
  const splash = document.getElementById("splash");
  const splashFoot = splash ? splash.querySelector(".splash-foot") : null;

  function setSplashText(txt) {
    if (splashFoot) splashFoot.textContent = txt;
  }

  function hideSplash() {
    if (!splash) return;
    splash.classList.add("is-hidden");
    window.setTimeout(() => {
      if (splash && splash.parentNode) splash.remove();
    }, 450);
  }

  // Tempo mínimo e máximo (segurança)
  const splashMinMs = 700;     // bonito/AAA
  const splashMaxMs = 4000;    // NUNCA trava
  const splashStart = performance.now();

  // Timeout de segurança: se algo quebrar, some mesmo assim
  const splashSafetyTimer = window.setTimeout(() => {
    setSplashText("Iniciando…");
    hideSplash();
  }, splashMaxMs);

  function doneSplash() {
    const elapsed = performance.now() - splashStart;
    const wait = Math.max(0, splashMinMs - elapsed);
    window.setTimeout(() => {
      window.clearTimeout(splashSafetyTimer);
      hideSplash();
    }, wait);
  }

  function failSplash(msg) {
    setSplashText(msg || "Erro ao carregar. Abrindo mesmo assim…");
    // mesmo com erro, abre após um tempinho
    window.setTimeout(() => {
      window.clearTimeout(splashSafetyTimer);
      hideSplash();
    }, 900);
  }

  // ===== PWA / SERVICE WORKER =====
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./service-worker.js").catch(() => {});
    });
  }

  // ===== ELEMENTOS =====
  const itemNameInput = document.getElementById("itemName");
  const itemQuantityInput = document.getElementById("itemQuantity");
  const itemPriceInput = document.getElementById("itemPrice");
  const toBuyListContainer = document.getElementById("toBuyList");
  const boughtListContainer = document.getElementById("boughtList");
  const totalValueSpan = document.getElementById("totalValue");
  const saveListBtn = document.getElementById("saveListBtn");
  const exportPdfBtn = document.getElementById("exportPdfBtn");
  const clearListBtn = document.getElementById("clearListBtn");
  const savedListsContainer = document.getElementById("savedLists");
  const addItemBtn = document.getElementById("addItemBtn");
  const seniorModeBtn = document.getElementById("seniorModeBtn");
  const clearBoughtBtn = document.getElementById("clearBoughtBtn");
  const moveBoughtBtn = document.getElementById("moveBoughtBtn");
  const adminBtn = document.getElementById("adminBtn");
  const ocrPriceBtn = document.getElementById("ocrPriceBtn");
  const ocrFileInput = document.getElementById("ocrFileInput");
  const ocrModal = document.getElementById("ocrModal");
  const ocrCloseBtn = document.getElementById("ocrCloseBtn");
  const ocrRetryBtn = document.getElementById("ocrRetryBtn");
  const ocrUseBtn = document.getElementById("ocrUseBtn");
  const ocrPreview = document.getElementById("ocrPreview");
  const ocrStatus = document.getElementById("ocrStatus");
  const ocrFastMode = document.getElementById("ocrFastMode");
  const ocrCropMode = document.getElementById("ocrCropMode");
  const toastEl = document.getElementById("toast");


  // Se por algum motivo o HTML mudou e faltou algo, não trava no splash
  const required = [
    itemNameInput, itemQuantityInput, itemPriceInput,
    toBuyListContainer, boughtListContainer, totalValueSpan,
    saveListBtn, exportPdfBtn, clearListBtn,
    savedListsContainer, addItemBtn, seniorModeBtn, clearBoughtBtn, moveBoughtBtn, adminBtn,
    ocrPriceBtn, ocrFileInput, ocrModal, ocrCloseBtn, ocrRetryBtn, ocrUseBtn, ocrPreview, ocrStatus, ocrFastMode, ocrCropMode, toastEl
  ];
  if (required.some((x) => !x)) {
    failSplash("Arquivos incompletos. Verifique index.html.");
    return;
  }

  let currentItems = [];

  // ===== UI: Toast =====
  let toastTimer = null;
  function toast(msg){
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(()=> toastEl.classList.remove("show"), 1800);
  }

  // ===== Modo Sênior =====
  function setSeniorMode(on){
    document.body.classList.toggle("mode-senior", !!on);
    if (seniorModeBtn) seniorModeBtn.setAttribute("aria-pressed", on ? "true" : "false");
    localStorage.setItem("modeSenior", on ? "1" : "0");
    toast(on ? "Modo Sênior ativado" : "Modo Sênior desativado");
  }
  const isSenior = localStorage.getItem("modeSenior") === "1";
  if (isSenior) document.body.classList.add("mode-senior");
  if (seniorModeBtn) {
    seniorModeBtn.addEventListener("click", () => {
      setSeniorMode(!document.body.classList.contains("mode-senior"));
    });
  }

  function normalizeItemFromSaved(it){
    return { name: it.name, quantity: it.quantity, price: it.price, bought: !!it.bought };
  }

  function normalizeCurrentItems(){
    currentItems = currentItems.map((it)=> ({...it, bought: !!it.bought}));
  }

  function money(n) {
    const v = Number.isFinite(n) ? n : 0;
    return `R$ ${v.toFixed(2)}`;

  }

  // ===== UI helpers (Toast + Modal) =====
  let lastOcrPrice = null;

  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("is-show");
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => toastEl.classList.remove("is-show"), 2600);
  }

  function openOcrModal() {
    if (!ocrModal) return;
    ocrModal.classList.add("is-open");
    ocrModal.setAttribute("aria-hidden", "false");
  }

  function closeOcrModal() {
    if (!ocrModal) return;
    ocrModal.classList.remove("is-open");
    ocrModal.setAttribute("aria-hidden", "true");
  }

  // ===== OCR (client-side) =====
  function loadScriptOnce(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[data-src="${src}"]`);
      if (existing) return resolve();
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.defer = true;
      s.setAttribute("data-src", src);
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Falha ao carregar script"));
      document.head.appendChild(s);
    });
  }

  async function ensureTesseract() {
    // Carrega sob demanda (evita pesar o carregamento inicial)
    if (window.Tesseract) return;
    // CDN confiável (runtime cache do Service Worker ajuda depois)
    await loadScriptOnce("https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js");
    if (!window.Tesseract) throw new Error("OCR indisponível");
  }

  function normalizeTextForParse(s) {
    return String(s || "")
      .replace(/\s+/g, " ")
      .replace(/[^\d.,\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function extractBestPrice(rawText) {
    const t = normalizeTextForParse(rawText);
    if (!t) return null;

    // Captura números tipo: 5,99 | 12.50 | 1.299,00 | 1299,00
    const matches = t.match(/\d{1,3}(?:[.\s]\d{3})*(?:[.,]\d{2})|\d+(?:[.,]\d{2})/g);
    if (!matches || !matches.length) return null;

    const candidates = matches
      .map((m) => {
        // Remove separador de milhar (ponto/espaço) e normaliza decimal para ponto
        const cleaned = m.replace(/\s/g, "");
        const hasComma = cleaned.includes(",");
        const hasDot = cleaned.includes(".");
        let vStr = cleaned;

        if (hasComma && hasDot) {
          // Ex: 1.299,00 -> remove pontos, vírgula vira decimal
          vStr = cleaned.replace(/\./g, "").replace(",", ".");
        } else if (hasComma) {
          vStr = cleaned.replace(",", ".");
        } else {
          // 12.50 já está ok; 1.299 pode ser milhar sem centavos (mas regex exige 2 casas)
          vStr = cleaned;
        }

        const v = Number(vStr);
        if (!Number.isFinite(v)) return null;

        // Filtra valores absurdos
        if (v <= 0 || v > 99999) return null;
        return v;
      })
      .filter(Boolean);

    if (!candidates.length) return null;

    // Heurística simples: escolhe o MAIOR valor com centavos (normalmente o preço)
    // (evita pegar "1,00" de peso / porcentagem quando há um preço maior)
    candidates.sort((a, b) => b - a);
    return candidates[0];
  }

  
  async function fileToOcrBlob(file, cropEnabled, fastMode) {
    // Converte a imagem em um blob otimizado para OCR (corte central + redimensionamento)
    const img = new Image();
    img.decoding = "async";
    const url = URL.createObjectURL(file);
    try {
      await new Promise((res, rej) => {
        img.onload = () => res();
        img.onerror = () => rej(new Error("Imagem inválida"));
        img.src = url;
      });

      // Dimensões originais
      const iw = img.naturalWidth || img.width;
      const ih = img.naturalHeight || img.height;

      // Define área de corte (central)
      let sx = 0, sy = 0, sw = iw, sh = ih;
      if (cropEnabled) {
        // Foca numa faixa central onde normalmente fica o valor
        sw = Math.max(1, Math.round(iw * 0.72));
        sh = Math.max(1, Math.round(ih * 0.42));
        sx = Math.round((iw - sw) / 2);
        sy = Math.round((ih - sh) / 2);
      }

      // Redimensiona para acelerar (mantém leitura boa)
      const maxW = fastMode ? 900 : 1400;
      const scale = Math.min(1, maxW / sw);
      const tw = Math.max(1, Math.round(sw * scale));
      const th = Math.max(1, Math.round(sh * scale));

      const canvas = document.createElement("canvas");
      canvas.width = tw;
      canvas.height = th;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });

      // Leve aumento de contraste (ajuda em etiqueta/nota fiscal)
      ctx.filter = "contrast(1.25) brightness(1.05)";
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, tw, th);
      ctx.filter = "none";

      const blob = await new Promise((resolve) => {
        // JPEG é menor e suficiente para dígitos
        canvas.toBlob((b) => resolve(b), "image/jpeg", 0.92);
      });

      return blob || file;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

async function recognizePriceFromImage(file) {
    await ensureTesseract();

    const cropEnabled = !!(ocrCropMode && ocrCropMode.checked);
    const fastMode = !!(ocrFastMode && ocrFastMode.checked);

    const imgUrl = URL.createObjectURL(file);
    ocrPreview.src = imgUrl;

    // Visual: guia de foco no valor
    if (cropEnabled) {
      ocrPreview.closest(".ocr-preview-wrap")?.classList.add("is-crop");
    } else {
      ocrPreview.closest(".ocr-preview-wrap")?.classList.remove("is-crop");
    }

    ocrStatus.textContent = "Analisando imagem…";
    ocrUseBtn.disabled = true;
    lastOcrPrice = null;

    try {
      const ocrBlob = await fileToOcrBlob(file, cropEnabled, fastMode);
      const { data } = await window.Tesseract.recognize(
        ocrBlob,
        "eng",
        {
          logger: (m) => {
            if (m && m.status) {
              const pct = m.progress ? Math.round(m.progress * 100) : null;
              ocrStatus.textContent = pct != null ? `${m.status} (${pct}%)…` : `${m.status}…`;
            }
          },
          tessedit_char_whitelist: "0123456789.,",
        }
      );

      const best = extractBestPrice(data && data.text ? data.text : "");
      if (best == null) {
        ocrStatus.textContent = "Não consegui identificar um preço. Tente aproximar e focar no valor.";
        showToast("Não achei um preço. Tente outra foto.");
        return null;
      }

      lastOcrPrice = best;
      ocrStatus.textContent = `Preço detectado: ${money(best)} — confirme abaixo.`;
      ocrUseBtn.disabled = false;
      return best;
    } catch (e) {
      console.error(e);
      ocrStatus.textContent = "Falha ao ler a imagem. Tente novamente.";
      showToast("Erro no OCR. Tente outra foto.");
      return null;
    } finally {
      // Mantém preview; não revoga agora para permitir confirmação
    }
  }

  function updateListDisplay() {
    toBuyListContainer.innerHTML = "";
    if (boughtListContainer) boughtListContainer.innerHTML = "";

    let total = 0;
    currentItems.forEach((it) => {
      total += (Number(it.quantity) || 0) * (Number(it.price) || 0);
    });

    function makeCard(item, index) {
      const card = document.createElement("div");
      card.className = "item-card" + (item.bought ? " is-bought" : "");

      const left = document.createElement("div");
      left.className = "item-left";

      const checkWrap = document.createElement("label");
      checkWrap.className = "check-wrap";

      const check = document.createElement("input");
      check.type = "checkbox";
      check.className = "item-check";
      check.checked = !!item.bought;
      check.setAttribute("aria-label", item.bought ? "Item comprado" : "Item a comprar");

      check.addEventListener("change", () => {
        currentItems[index].bought = check.checked;
        updateListDisplay();
        toast(check.checked ? "Marcado como comprado" : "Movido para a comprar");
      });

      checkWrap.appendChild(check);

      const info = document.createElement("div");
      info.className = "item-info";

      const nameEl = document.createElement("div");
      nameEl.className = "item-name";
      nameEl.textContent = item.name;

      const metaEl = document.createElement("div");
      metaEl.className = "item-meta";
      metaEl.textContent = `${item.quantity} × ${money(item.price)} = ${money((item.quantity || 0) * (item.price || 0))}`;

      info.appendChild(nameEl);
      info.appendChild(metaEl);

      left.appendChild(checkWrap);
      left.appendChild(info);

      const actions = document.createElement("div");
      actions.className = "item-actions";

      const removeBtn = document.createElement("button");
      removeBtn.className = "icon-button";
      removeBtn.title = "Remover item";
      removeBtn.setAttribute("aria-label", "Remover item");
      removeBtn.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /></svg>';

      removeBtn.addEventListener("click", () => {
        currentItems.splice(index, 1);
        updateListDisplay();
        toast("Item removido");
      });

      actions.appendChild(removeBtn);

      card.appendChild(left);
      card.appendChild(actions);
      return card;
    }

    currentItems.forEach((item, index) => {
      const card = makeCard(item, index);
      if (item.bought && boughtListContainer) {
        boughtListContainer.appendChild(card);
      } else {
        toBuyListContainer.appendChild(card);
      }
    });

    totalValueSpan.textContent = money(total);
  }

  function addItem() {
    const raw = itemNameInput.value.trim();

    if (!raw) {
      alert("Informe o nome do item.");
      itemNameInput.focus();
      return;
    }

    let quantity = parseFloat(itemQuantityInput.value) || 1;
    let price = parseFloat(itemPriceInput.value) || 0;
    let name = raw;

    const cleaned = raw.replace(/\s+/g, " ").trim();
    const tokens = cleaned.split(" ");

    if (tokens.length >= 2 && /^[0-9]+([.,][0-9]+)?$/.test(tokens[0])) {
      const q = parseFloat(tokens[0].replace(",", "."));
      if (Number.isFinite(q) && q > 0) {
        quantity = q;
        tokens.shift();
      }
    }

    const last = tokens[tokens.length - 1];
    if (last && /[0-9]/.test(last)) {
      const cand = last.replace(/[^\d.,]/g, "");
      const normalized = cand.includes(",") && cand.includes(".")
        ? cand.replace(/\./g, "").replace(",", ".")
        : cand.replace(",", ".");
      const p = parseFloat(normalized);
      if (Number.isFinite(p)) {
        price = p;
        tokens.pop();
      }
    }

    name = tokens.join(" ").trim();
    if (!name) name = raw;

    if (quantity <= 0 || price < 0) {
      alert("Quantidade e preço devem ser válidos.");
      return;
    }

    currentItems.push({ name, quantity, price, bought: false });
    itemNameInput.value = "";
    itemQuantityInput.value = "1";
    itemPriceInput.value = "";
    updateListDisplay();
    itemNameInput.focus();
    toast("Item adicionado");
  }

  function generateDefaultListName() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `Lista ${year}-${month}`;
  }

  function saveCurrentList() {
    if (currentItems.length === 0) {
      alert("Adicione ao menos um item antes de salvar.");
      return;
    }

    let name = prompt("Informe um nome para a lista:", generateDefaultListName());
    if (!name) return;
    name = name.trim();
    if (!name) return;

    const lists = JSON.parse(localStorage.getItem("shoppingLists") || "[]");
    const id = Date.now();
    const total = currentItems.reduce((sum, it) => sum + it.quantity * it.price, 0);

    lists.push({
      id,
      name,
      items: currentItems,
      total,
      createdAt: new Date().toISOString(),
    });

    localStorage.setItem("shoppingLists", JSON.stringify(lists));

    currentItems = [];
    updateListDisplay();
    loadSavedLists();
  }

  function loadSavedLists() {
    savedListsContainer.innerHTML = "";
    const lists = JSON.parse(localStorage.getItem("shoppingLists") || "[]");

    if (lists.length === 0) {
      const msg = document.createElement("p");
      msg.textContent = "Nenhuma lista salva.";
      savedListsContainer.appendChild(msg);
      return;
    }

    lists.sort((a, b) => b.id - a.id);

    lists.forEach((list) => {
      const card = document.createElement("div");
      card.className = "saved-list-card";

      const info = document.createElement("div");
      info.className = "saved-info";
      info.innerHTML =
        `<div><strong>${list.name}</strong><br><small>${new Date(list.createdAt).toLocaleDateString()}</small></div>` +
        `<div><strong>${money(list.total)}</strong></div>`;

      const actions = document.createElement("div");
      actions.className = "saved-actions";

      const loadBtn = document.createElement("button");
      loadBtn.className = "secondary-button";
      loadBtn.textContent = "Carregar";
      loadBtn.addEventListener("click", () => {
        if (currentItems.length > 0 && !confirm("A lista atual será substituída. Continuar?")) return;
        currentItems = (list.items || []).map(normalizeItemFromSaved);
        normalizeCurrentItems();
        updateListDisplay();
      });

      const pdfBtn = document.createElement("button");
      pdfBtn.className = "secondary-button";
      pdfBtn.textContent = "PDF";
      pdfBtn.addEventListener("click", () => exportListToPdf(list.items, list.name));

      const delBtn = document.createElement("button");
      delBtn.className = "danger-button";
      delBtn.textContent = "Excluir";
      delBtn.addEventListener("click", () => {
        if (!confirm("Excluir esta lista?")) return;
        const updated = lists.filter((l) => l.id !== list.id);
        localStorage.setItem("shoppingLists", JSON.stringify(updated));
        loadSavedLists();
      });

      actions.appendChild(loadBtn);
      actions.appendChild(pdfBtn);
      actions.appendChild(delBtn);

      card.appendChild(info);
      card.appendChild(actions);
      savedListsContainer.appendChild(card);
    });
  }

  function clearCurrentList() {
    if (currentItems.length === 0) return;
    if (confirm("Remover todos os itens da lista atual?")) {
      currentItems = [];
      updateListDisplay();
    }
  }

  function exportListToPdf(items, listName = "Lista de Compras") {
    if (!items || items.length === 0) {
      alert("Não há itens para exportar.");
      return;
    }

    const jsPdfLoaded = window.jspdf && window.jspdf.jsPDF;

    // ✅ Se o jsPDF não carregou (CDN falhou), NÃO trava — faz fallback print
    if (jsPdfLoaded && window.jspdf.autoTable) {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();

      doc.setFontSize(14);
      doc.text(listName, 14, 18);

      const body = items.map((it) => [
        it.name,
        String(it.quantity),
        money(it.price),
        money(it.quantity * it.price),
      ]);

      window.jspdf.autoTable(doc, {
        head: [["Item", "Quantidade", "Preço", "Subtotal"]],
        body,
        startY: 24,
      });

      const total = items.reduce((sum, it) => sum + it.quantity * it.price, 0);
      const y = (doc.lastAutoTable && doc.lastAutoTable.finalY) ? doc.lastAutoTable.finalY + 10 : 40;
      doc.text(`Total: ${money(total)}`, 14, y);

      doc.save(`${listName.replace(/\s+/g, "_")}.pdf`);
      return;
    }

    // Fallback: imprimir HTML
    const win = window.open("", "_blank");
    if (!win) {
      alert("Pop-up bloqueado. Permita pop-ups para exportar.");
      return;
    }

    const htmlRows = items
      .map(
        (it) =>
          `<tr><td>${it.name}</td><td>${it.quantity}</td><td>${money(it.price)}</td><td>${money(it.quantity * it.price)}</td></tr>`
      )
      .join("");

    win.document.write(`
      <html>
        <head>
          <title>${listName}</title>
          <style>
            body{font-family:Arial;padding:18px;}
            table{width:100%;border-collapse:collapse;}
            th,td{border:1px solid #ccc;padding:10px;text-align:left;}
            th{background:#f3f4f6;}
          </style>
        </head>
        <body>
          <h1>${listName}</h1>
          <table>
            <thead><tr><th>Item</th><th>Qtd</th><th>Preço</th><th>Subtotal</th></tr></thead>
            <tbody>${htmlRows}</tbody>
          </table>
          <script>window.onload=()=>window.print()</script>
        </body>
      </html>
    `);
    win.document.close();
  }

  // DLC Suggestions (NUNCA trava)
  function populateItemSuggestions() {
    try {
      if (!window.DlcLoader || !window.DlcLoader.getAdditionalItems) return;
      const additionalItems = window.DlcLoader.getAdditionalItems();
      if (!additionalItems || additionalItems.length === 0) return;

      let dataList = document.getElementById("itemSuggestions");
      if (!dataList) {
        dataList = document.createElement("datalist");
        dataList.id = "itemSuggestions";
        document.body.appendChild(dataList);
        itemNameInput.setAttribute("list", "itemSuggestions");
      }

      dataList.innerHTML = "";
      additionalItems.forEach((it) => {
        const opt = document.createElement("option");
        opt.value = it.name;
        dataList.appendChild(opt);
      });
    } catch (_) {
      // ignora
    }
  }

  // ===== INIT (à prova de travamento) =====
  async function init() {
    setSplashText("Carregando recursos…");

    // 1) Tenta inicializar DLCs, mas com timeout interno
    if (window.DlcLoader && window.DlcLoader.init) {
      try {
        setSplashText("Carregando conteúdos…");

        // timeout de 1.2s pro DlcLoader (se travar, segue)
        const dlcPromise = window.DlcLoader.init();
        const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 1200));
        await Promise.race([dlcPromise, timeoutPromise]);
      } catch (_) {
        // ignora erro do DLC pra não travar
      }
    }

    // 2) Render básico
    setSplashText("Finalizando…");
    populateItemSuggestions();
    updateListDisplay();
    loadSavedLists();

    // 3) Splash some SEMPRE
    doneSplash();
  }

  // Eventos
  addItemBtn.addEventListener("click", addItem);
  saveListBtn.addEventListener("click", saveCurrentList);
  exportPdfBtn.addEventListener("click", () => exportListToPdf(currentItems, "Lista Atual"));
  if (clearBoughtBtn) {
    clearBoughtBtn.addEventListener("click", () => {
      const before = currentItems.length;
      currentItems = currentItems.filter((it) => !it.bought);
      if (currentItems.length !== before) {
        updateListDisplay();
        toast("Comprados limpos");
      } else {
        toast("Nenhum comprado para limpar");
      }
    });
  }

  if (moveBoughtBtn) {
    moveBoughtBtn.addEventListener("click", () => {
      const bought = currentItems.filter((it) => it.bought);
      if (bought.length === 0) {
        toast("Nenhum item comprado");
        return;
      }
      // cria uma nova lista salva só com comprados e remove-os da lista atual
      const lists = JSON.parse(localStorage.getItem("shoppingLists") || "[]");
      const id = Date.now();
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const name = `Comprados ${year}-${month}`;
      const total = bought.reduce((sum, it) => sum + (it.quantity||0)*(it.price||0), 0);
      lists.push({ id, name, items: bought, total, createdAt: new Date().toISOString() });
      localStorage.setItem("shoppingLists", JSON.stringify(lists));

      currentItems = currentItems.filter((it) => !it.bought);
      updateListDisplay();
      loadSavedLists();
      toast("Comprados movidos");
    });
  }

  clearListBtn.addEventListener("click", clearCurrentList);


  // OCR — ler preço pela câmera
  ocrPriceBtn.addEventListener("click", () => {
    // abre câmera/galeria
    ocrFileInput.value = "";
    ocrFileInput.click();
  });

  // Preferências do OCR (persistem localmente)
  const OCR_PREF_KEY = "ocr_prefs_v1";
  (function loadOcrPrefs() {
    try {
      const prefs = JSON.parse(localStorage.getItem(OCR_PREF_KEY) || "{}");
      if (ocrFastMode && typeof prefs.fastMode === "boolean") ocrFastMode.checked = prefs.fastMode;
      if (ocrCropMode && typeof prefs.cropEnabled === "boolean") ocrCropMode.checked = prefs.cropEnabled;
    } catch {}
  })();

  function saveOcrPrefs() {
    try {
      localStorage.setItem(
        OCR_PREF_KEY,
        JSON.stringify({
          fastMode: !!(ocrFastMode && ocrFastMode.checked),
          cropEnabled: !!(ocrCropMode && ocrCropMode.checked),
        })
      );
    } catch {}
  }

  if (ocrFastMode) ocrFastMode.addEventListener("change", saveOcrPrefs);
  if (ocrCropMode) ocrCropMode.addEventListener("change", () => {
    saveOcrPrefs();
    const wrap = ocrPreview.closest(".ocr-preview-wrap");
    if (wrap) wrap.classList.toggle("is-crop", !!ocrCropMode.checked);
  });


  ocrFileInput.addEventListener("change", async () => {
    const file = ocrFileInput.files && ocrFileInput.files[0];
    if (!file) return;

    openOcrModal();
    ocrStatus.textContent = "Preparando OCR…";
    await recognizePriceFromImage(file);
  });

  // Fechar modal
  ocrCloseBtn.addEventListener("click", closeOcrModal);
  ocrModal.addEventListener("click", (e) => {
    const target = e.target;
    if (target && target.getAttribute && target.getAttribute("data-close") === "true") {
      closeOcrModal();
    }
  });

  // Retry
  ocrRetryBtn.addEventListener("click", () => {
    ocrFileInput.value = "";
    ocrFileInput.click();
  });

  // Usar preço detectado
  ocrUseBtn.addEventListener("click", () => {
    if (lastOcrPrice == null) return;
    itemPriceInput.value = String(lastOcrPrice.toFixed(2));
    closeOcrModal();
    showToast(`Preço aplicado: ${money(lastOcrPrice)}`);
    itemPriceInput.focus();
  });


  adminBtn.addEventListener("click", () => (window.location.href = "admin.html"));

  // Enter rápido
  itemPriceInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") addItem();
  });

  // Qualquer erro JS agora NÃO prende o splash
  try {
    init();
  } catch (e) {
    console.error(e);
    failSplash("Erro ao iniciar. Abrindo…");
  }
});
