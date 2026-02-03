// ===============================
// Lista de Compras Mensal
// Salva no LocalStorage por mês/ano
// Exporta para PDF
// ===============================

let itens = [];

// Formata número em moeda BR
function moeda(valor) {
  const num = Number(valor || 0);
  return num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Pega chave do mês
function chaveMes() {
  const mesAno = document.getElementById("mesAno").value;
  if (!mesAno) return null;
  return `listaCompras_${mesAno}`;
}

// Atualiza a tabela e o resumo
function render() {
  const tbody = document.getElementById("listaItens");
  tbody.innerHTML = "";

  itens.forEach((item, index) => {
    const tr = document.createElement("tr");

    const total = item.qtd * item.preco;

    tr.innerHTML = `
      <td>${item.nome}</td>
      <td>${item.qtd}</td>
      <td>R$ ${moeda(item.preco)}</td>
      <td>R$ ${moeda(total)}</td>
      <td><button class="remover" onclick="removerItem(${index})">Remover</button></td>
    `;

    tbody.appendChild(tr);
  });

  atualizarResumo();
}

// Atualiza valores do resumo
function atualizarResumo() {
  const saldoPrevisto = Number(document.getElementById("saldoPrevisto").value || 0);

  let totalGasto = 0;
  itens.forEach(i => totalGasto += i.qtd * i.preco);

  const diferenca = saldoPrevisto - totalGasto;

  document.getElementById("resumoSaldo").innerText = moeda(saldoPrevisto);
  document.getElementById("resumoTotal").innerText = moeda(totalGasto);
  document.getElementById("resumoDiferenca").innerText = moeda(diferenca);
}

// Adiciona item
function adicionarItem() {
  const nome = document.getElementById("produto").value.trim();
  const qtd = Number(document.getElementById("quantidade").value || 0);
  const preco = Number(document.getElementById("preco").value || 0);

  if (!nome) {
    alert("Digite o nome do produto.");
    return;
  }
  if (qtd <= 0) {
    alert("Digite uma quantidade válida.");
    return;
  }
  if (preco <= 0) {
    alert("Digite um valor unitário válido.");
    return;
  }

  itens.push({ nome, qtd, preco });

  // Limpa inputs
  document.getElementById("produto").value = "";
  document.getElementById("quantidade").value = "";
  document.getElementById("preco").value = "";
  document.getElementById("produto").focus();

  render();
}

// Remove item
function removerItem(index) {
  itens.splice(index, 1);
  render();
}

// Salvar lista do mês no localStorage
function salvarLista() {
  const key = chaveMes();
  if (!key) {
    alert("Selecione um mês/ano antes de salvar.");
    return;
  }

  const saldoPrevisto = Number(document.getElementById("saldoPrevisto").value || 0);

  const dados = {
    saldoPrevisto,
    itens
  };

  localStorage.setItem(key, JSON.stringify(dados));
  alert("Lista salva com sucesso ✅");
}

// Carregar lista do mês
function carregarLista() {
  const key = chaveMes();
  if (!key) {
    alert("Selecione um mês/ano antes de carregar.");
    return;
  }

  const raw = localStorage.getItem(key);
  if (!raw) {
    itens = [];
    document.getElementById("saldoPrevisto").value = "";
    render();
    alert("Nenhuma lista encontrada para este mês.");
    return;
  }

  const dados = JSON.parse(raw);
  itens = dados.itens || [];
  document.getElementById("saldoPrevisto").value = dados.saldoPrevisto || 0;

  render();
  alert("Lista carregada ✅");
}

// Exportar para PDF
async function exportarPDF() {
  const area = document.getElementById("conteudo-pdf");

  // Faz captura da tela do conteúdo
  const canvas = await html2canvas(area, { scale: 2 });
  const imgData = canvas.toDataURL("image/png");

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF("p", "mm", "a4");

  const larguraPagina = pdf.internal.pageSize.getWidth();
  const alturaPagina = pdf.internal.pageSize.getHeight();

  const imgProps = pdf.getImageProperties(imgData);
  const proporcao = imgProps.width / imgProps.height;

  const imgLargura = larguraPagina;
  const imgAltura = larguraPagina / proporcao;

  let posY = 0;

  // Se couber em uma página
  if (imgAltura <= alturaPagina) {
    pdf.addImage(imgData, "PNG", 0, 0, imgLargura, imgAltura);
  } else {
    // Se precisar quebrar em páginas
    let alturaRestante = imgAltura;

    while (alturaRestante > 0) {
      pdf.addImage(imgData, "PNG", 0, posY, imgLargura, imgAltura);
      alturaRestante -= alturaPagina;
      posY -= alturaPagina;

      if (alturaRestante > 0) pdf.addPage();
    }
  }

  const mes = document.getElementById("mesAno").value || "lista";
  pdf.save(`lista_compras_${mes}.pdf`);
}

// Atualiza resumo ao digitar saldo
document.addEventListener("DOMContentLoaded", () => {
  // Define mês atual automaticamente
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, "0");
  document.getElementById("mesAno").value = `${ano}-${mes}`;

  document.getElementById("saldoPrevisto").addEventListener("input", atualizarResumo);

  // Inicia vazio
  render();
});
