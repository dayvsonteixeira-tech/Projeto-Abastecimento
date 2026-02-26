let clientes = JSON.parse(localStorage.getItem("clientes")) || [];

const lista = document.getElementById("lista");
const filtroMes = document.getElementById("filtroMes");

function salvar() {
  localStorage.setItem("clientes", JSON.stringify(clientes));
}

function mostrar() {
  lista.innerHTML = "";

  let filtrados = clientes;
  if (filtroMes.value) {
    filtrados = clientes.filter(c => c.venda.startsWith(filtroMes.value));
  }

  filtrados.forEach((c, i) => {
    const li = document.createElement("li");

    const hoje = new Date();
    const venc = new Date(c.vencimento);

    if (!c.pago && venc < hoje) li.classList.add("vencido");
    if (c.pago) li.classList.add("pago");

    li.innerHTML = `
      <strong>${c.nome}</strong><br>
      Valor total: R$ ${c.valor}<br>
      Parcelas: ${c.parcelas}x de R$ ${c.valorParcela}<br>
      Venda: ${c.venda}<br>
      Vencimento: ${c.vencimento}<br>
      Status: ${c.pago ? "Pago" : "Não pago"}<br>
      <button onclick="togglePago(${i})">
        ${c.pago ? "Marcar Não Pago" : "Marcar Pago"}
      </button>
    `;

    lista.appendChild(li);
  });
}

function togglePago(index) {
  clientes[index].pago = !clientes[index].pago;
  salvar();
  mostrar();
}

document.getElementById("form").addEventListener("submit", e => {
  e.preventDefault();

  const valorTotal = parseFloat(valor.value);
  const qtdParcelas = parseInt(parcelas.value);
  const valorParcela = (valorTotal / qtdParcelas).toFixed(2);

  clientes.push({
    nome: nome.value,
    valor: valorTotal.toFixed(2),
    parcelas: qtdParcelas,
    valorParcela: valorParcela,
    venda: venda.value,
    vencimento: vencimento.value,
    pago: false
  });

  salvar();
  atualizarFiltro();
  mostrar();
  e.target.reset();
});

function atualizarFiltro() {
  const meses = [...new Set(clientes.map(c => c.venda.slice(0, 7)))];
  filtroMes.innerHTML = '<option value="">📅 Filtrar por mês</option>';
  meses.forEach(m => {
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = m;
    filtroMes.appendChild(opt);
  });
}

filtroMes.addEventListener("change", mostrar);

function exportar() {
  let csv = "Cliente,Valor Total,Parcelas,Valor Parcela,Venda,Vencimento,Status\n";
  clientes.forEach(c => {
    csv += `${c.nome},${c.valor},${c.parcelas},${c.valorParcela},${c.venda},${c.vencimento},${c.pago ? "Pago" : "Não pago"}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "sabrina_joias_vendas.csv";
  a.click();
}

function limparPagas() {
  if (confirm("Deseja remover todas as vendas PAGAS?")) {
    clientes = clientes.filter(c => !c.pago);
    salvar();
    atualizarFiltro();
    mostrar();
  }
}

function limparTudo() {
  if (confirm("ATENÇÃO: apagar TODAS as vendas?")) {
    clientes = [];
    salvar();
    atualizarFiltro();
    mostrar();
  }
}

atualizarFiltro();
mostrar();
