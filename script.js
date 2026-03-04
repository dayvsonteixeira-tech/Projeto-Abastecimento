firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// NOVA SOLICITAÇÃO
function solicitarMaterial() {
  const dados = {
    doca: doca.value,
    solicitante: solicitante.value,
    posicao: posicao.value,
    partnumber: partnumber.value,
    quantidade: Number(quantidade.value),
    usoCarro: usoCarro.value,
    solicitadoEm: new Date(),
    status: "PENDENTE",
    comentario: ""
  };

  if (Object.values(dados).includes("") || !dados.quantidade) {
    alert("Preencha todos os campos");
    return;
  }

  db.collection("solicitacoes").add(dados);
}

// FORMATAR ATRASO
function formatarAtraso(data) {
  const diff = new Date() - data;
  const min = Math.floor(diff / 60000);
  const h = Math.floor(min / 60);
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h ${min % 60}m`;
}

// LISTA PENDENTES
db.collection("solicitacoes").orderBy("solicitadoEm","desc")
.onSnapshot(snapshot => {
  lista.innerHTML = "";
  let total = 0;

  snapshot.forEach(doc => {
    const d = doc.data();
    if (d.status !== "PENDENTE") return;

    total++;
    const s = d.solicitadoEm.toDate();

    lista.innerHTML += `
      <tr class="pendente">
        <td data-label="Doca">${d.doca}</td>
        <td data-label="Solicitante">${d.solicitante}</td>
        <td data-label="Posição">${d.posicao}</td>
        <td data-label="Partnumber">${d.partnumber}</td>
        <td data-label="Qtd">${d.quantidade}</td>
        <td data-label="Uso">${d.usoCarro}</td>
        <td data-label="Solicitado">${s.toLocaleString()}</td>
        <td data-label="Atraso">${formatarAtraso(s)}</td>
        <td data-label="Comentário">
          <input id="comentario-${doc.id}">
        </td>
        <td>
          <button onclick="confirmar('${doc.id}')">Abastecido</button>
        </td>
      </tr>
    `;
  });

  kpiPendentes.innerText = total;
  atualizarGrafico();
});

// CONFIRMAR
function confirmar(id) {
  db.collection("solicitacoes").doc(id).update({
    status: "FINALIZADO",
    abastecidoEm: new Date(),
    comentario: document.getElementById(`comentario-${id}`).value
  });
}

// EXPORTAR EXCEL
function exportarExcel() {
  let csv = "Doca,Solicitante,Posição,Partnumber,Quantidade,Uso\n";
  db.collection("solicitacoes").get().then(snap => {
    snap.forEach(doc => {
      const d = doc.data();
      csv += `${d.doca},${d.solicitante},${d.posicao},${d.partnumber},${d.quantidade},${d.usoCarro}\n`;
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "abastecimentos.csv";
    a.click();
  });
}

// GRÁFICO
let grafico;
function atualizarGrafico() {
  db.collection("solicitacoes").where("status","==","FINALIZADO").get()
  .then(snap => {
    const dados = {};
    snap.forEach(doc => {
      const d = doc.data().abastecidoEm.toDate().toLocaleDateString();
      dados[d] = (dados[d] || 0) + 1;
    });

    if (grafico) grafico.destroy();

    grafico = new Chart(graficoDiario, {
      type: "bar",
      data: {
        labels: Object.keys(dados),
        datasets: [{
          data: Object.values(dados),
          backgroundColor: "#e74c3c"
        }]
      }
    });
  });
}
