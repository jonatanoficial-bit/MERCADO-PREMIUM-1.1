/* ============================================================================
 * js/categorizer.js — "IA" OFFLINE de categorias (sem custo)
 * - Normaliza (remove acentos, pontuação, plural simples)
 * - Mapeia por dicionário + fuzzy matching (Levenshtein)
 * - Aprende localmente quando usuário corrige categoria
 * ========================================================================== */
(function(){
  const STORAGE_KEY = "valeCategoryOverrides_v1";

  const CATEGORY_ORDER = [
    "Hortifruti",
    "Farináceos",
    "Padaria",
    "Carnes",
    "Laticínios",
    "Bebidas",
    "Enlatados",
    "Congelados",
    "Higiene",
    "Limpeza",
    "Pet",
    "Outros",
  ];

  const KEYWORDS = {
    "Hortifruti": [
      "tomate","cebola","alho","batata","banana","maca","maça","laranja","limão","limao","uva","manga",
      "alface","couve","espinafre","brocolis","brócolis","cenoura","pepino","abobrinha","pimentao","pimentão",
      "morango","pera","pêra","kiwi","melancia","melao","melão","abacaxi","abacate","feijao verde","feijão verde"
    ],
    "Farináceos": [
      "acucar","açucar","arroz","feijao","feijão","farinha","fermento","amido","maizena","macarrao","macarrão",
      "aveia","granola","cereal","trigo","fuba","fubá","polvilho","tapioca","sal","oleo","óleo","azeite",
      "molho","extrato","tempero","caldo","pimenta","canela"
    ],
    "Padaria": ["pao","pão","bolo","bisnaguinha","torrada","biscoito","bolacha","wafer","croissant"],
    "Carnes": ["carne","frango","peixe","tilapia","tilápia","salsicha","linguica","linguiça","presunto","bacon","mortadela","ovo","ovos"],
    "Laticínios": ["leite","queijo","manteiga","margarina","iogurte","requeijao","requeijão","creme de leite","nata"],
    "Bebidas": ["agua","água","suco","refrigerante","cafe","café","cha","chá","isotonico","energético","energetico"],
    "Enlatados": ["atum","sardinha","milho","ervilha","azeitona","palmito","molho de tomate","feijao enlatado","feijão enlatado"],
    "Congelados": ["pizza","hamburguer","hambúrguer","lasanha","nuggets","batata congelada","sorvete"],
    "Higiene": ["sabonete","shampoo","xampu","condicionador","creme dental","pasta de dente","escova","desodorante","absorvente","papel higienico","papel higiênico","algodao","algodão"],
    "Limpeza": ["detergente","sabao","sabão","amaciante","agua sanitaria","água sanitária","desinfetante","esponja","limpa vidro","cloro","alvejante","lustra moveis","lustra móveis","saco de lixo"],
    "Pet": ["racao","ração","areia","petisco","shampoo pet","tapete higienico","tapete higiênico"]
  };

  function normalizeText(s){
    return (s || "")
      .toString()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function singularizeSimple(token){
    // plural simples em PT (bem conservador)
    if (token.endsWith("oes")) return token.slice(0, -3) + "ao"; // limões->limao (aprox)
    if (token.endsWith("ais")) return token.slice(0, -3) + "al"; // cereais->cereal (aprox)
    if (token.endsWith("eis")) return token.slice(0, -3) + "el"; // papéis->papel (aprox)
    if (token.endsWith("s") && token.length > 3) return token.slice(0, -1);
    return token;
  }

  function levenshtein(a,b){
    if (a === b) return 0;
    if (!a) return (b || "").length;
    if (!b) return a.length;
    const m = a.length, n = b.length;
    const dp = new Array(n+1);
    for (let j=0;j<=n;j++) dp[j]=j;
    for (let i=1;i<=m;i++){
      let prev = dp[0];
      dp[0]=i;
      for (let j=1;j<=n;j++){
        const tmp = dp[j];
        const cost = a[i-1] === b[j-1] ? 0 : 1;
        dp[j] = Math.min(
          dp[j] + 1,
          dp[j-1] + 1,
          prev + cost
        );
        prev = tmp;
      }
    }
    return dp[n];
  }

  function similarity(a,b){
    a = normalizeText(a);
    b = normalizeText(b);
    if (!a || !b) return 0;
    const dist = levenshtein(a,b);
    const maxLen = Math.max(a.length,b.length) || 1;
    return 1 - (dist / maxLen);
  }

  function loadOverrides(){
    try{
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") || {};
    }catch(e){
      return {};
    }
  }

  function saveOverrides(map){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map || {}));
  }

  function setOverride(itemName, category){
    const norm = normalizeText(itemName);
    if (!norm) return;
    const map = loadOverrides();
    map[norm] = category;
    saveOverrides(map);
  }

  function getOverride(itemName){
    const norm = normalizeText(itemName);
    if (!norm) return null;
    const map = loadOverrides();
    return map[norm] || null;
  }

  function categorize(itemName){
    const norm = normalizeText(itemName);
    if (!norm) return "Outros";

    const override = getOverride(norm);
    if (override) return override;

    const tokens = norm.split(" ").map(singularizeSimple);
    let bestCat = "Outros";
    let bestScore = 0;

    for (const cat of Object.keys(KEYWORDS)){
      const keys = KEYWORDS[cat] || [];
      for (const k of keys){
        const kn = normalizeText(k);
        // match por substring (muito forte)
        if (norm.includes(kn)){
          const score = 1.0;
          if (score > bestScore){ bestScore = score; bestCat = cat; }
          continue;
        }
        // fuzzy por token
        for (const t of tokens){
          const sim = similarity(t, kn);
          // limiares conservadores (evita classificar errado)
          if (sim >= 0.86){
            const score = sim;
            if (score > bestScore){ bestScore = score; bestCat = cat; }
          }
        }
      }
    }

    return bestCat;
  }

  window.ValeCategorizer = {
    normalizeText,
    categorize,
    CATEGORY_ORDER,
    setOverride,
    getOverride,
  };
})();
