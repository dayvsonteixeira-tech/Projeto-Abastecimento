firebase.initializeApp({
  apiKey: "AIzaSyDgpRxB7gluCbqEnFHIf68xDQVRmAp0dBo",
  authDomain: "controle-abastecimento-f80ed.firebaseapp.com",
  projectId: "controle-abastecimento-f80ed"
});

const db = firebase.firestore();

// NOVA SOLICITAÇÃO
function solicitarMaterial() {
  const campos = ["doca","solicitante","posicao","partnumber","quantidade","usoCarro"];
  const dados = {};

  for (let c of campos) {
    const el = document.getElementById(c);
    if (!el.value) return alert("Preencha todos os campos");
    dados[c] = el.value;
    el.value = "";
  }

  dados.solicitadoEm = new Date();
  dados.status = "PENDENTE";
  dados.comentario = "";
  dados.abastecidoEm = null;

  db.collection("solicitacoes").add(dados);
}

// LISTA PENDENTES
db.collection("solicitacoes").orderBy("solicitadoEm","desc")
.onSnapshot(snapshot => {
  const lista = document.getElementById("lista");
  const kpi = document.getElementById("kpiPendentes");
  lista.innerHTML = "";
  let total = 0;

  snapshot.forEach(doc => {
    const d = doc.data();
    if (d.status !== "PENDENTE") return;
    total++;

    lista.innerHTML += `
<tr class="pendente">
<td data-label="Doca">${d.doca}</td>
<td data-label="Solicitante">${d.solicitante}</td>
<td data-label="Posição">${d.posicao}</td>
<td data-label="Partnumber">${d.partnumber}</td>
<td data-label="Qtd">${d.quantidade}</td>
<td data-label="Uso/Carro">${d.usoCarro}</td>
<td data-label="Solicitado">${d.solicitadoEm.toDate().toLocaleString()}</td>
<td data-label="Atraso" data-solicitado="${d.solicitadoEm.toDate().toISOString()}"></td>
<td><input id="c-${doc.id}" placeholder="Comentário"></td>
<td><button onclick="confirmar('${doc.id}')">Abastecido</button></td>
</tr>`;
  });

  kpi.innerText = total;
  atualizarGrafico();
});

// CONFIRMAR
function confirmar(id) {
  db.collection("solicitacoes").doc(id).update({
    status: "FINALIZADO",
    abastecidoEm: new Date(),
    comentario: document.getElementById(`c-${id}`).value
  });
}

// ATRASO EM DIAS / HORAS / MINUTOS
function formatarAtraso(ms) {
  const min = Math.floor(ms / 60000);
  const h = Math.floor(min / 60);
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h ${min % 60}m`;
}

setInterval(() => {
  document.querySelectorAll("[data-solicitado]").forEach(el => {
    el.innerText = formatarAtraso(new Date() - new Date(el.dataset.solicitado));
  });
}, 60000);

// FILTRO HISTÓRICO
function filtrarPorData() {
  const data = document.getElementById("filtroData").value;
  if (!data) return;

  const ini = new Date(data + "T00:00");
  const fim = new Date(data + "T23:59");
  const h = document.getElementById("historico");
  h.innerHTML = "";

  db.collection("solicitacoes").where("status","==","FINALIZADO").get()
  .then(snap => {
    snap.forEach(doc => {
      const d = doc.data();
      const ab = d.abastecidoEm.toDate();
      if (ab >= ini && ab <= fim) {
        h.innerHTML += `
<tr>
<td>${d.doca}</td><td>${d.solicitante}</td><td>${d.posicao}</td>
<td>${d.partnumber}</td><td>${d.quantidade}</td><td>${d.usoCarro}</td>
<td>${d.solicitadoEm.toDate().toLocaleString()}</td>
<td>${ab.toLocaleString()}</td><td>${d.comentario}</td>
</tr>`;
      }
    });
  });
}

// EXPORTAR EXCEL
function exportarExcel() {
  let csv = "Doca,Solicitante,Posição,Partnumber,Quantidade,Uso por Carro,Solicitado,Abastecido,Comentário\n";
  document.querySelectorAll("#historico tr").forEach(tr => {
    csv += [...tr.children].map(td => `"${td.innerText}"`).join(",") + "\n";
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "historico_abastecimento.csv";
  a.click();
}

// GRÁFICO
let grafico;
function atualizarGrafico() {
  db.collection("solicitacoes").where("status","==","FINALIZADO").get()
  .then(snap => {
    const dados = {};
    snap.forEach(d => {
      const dia = d.data().abastecidoEm.toDate().toLocaleDateString();
      dados[dia] = (dados[dia] || 0) + 1;
    });

    if (grafico) grafico.destroy();
    grafico = new Chart(document.getElementById("graficoDiario"), {
      type: "bar",
      data: {
        labels: Object.keys(dados),
        datasets: [{ data: Object.values(dados), backgroundColor: "#dc2626" }]
      }
    });
  });
}
