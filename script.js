script.js 2.9

// FIREBASE
firebase.initializeApp({
  apiKey: "AIzaSyDgpRxB7gluCbqEnFHIf68xDQVRmAp0dBo",
  authDomain: "controle-abastecimento-f80ed.firebaseapp.com",
  projectId: "controle-abastecimento-f80ed"
});
const db = firebase.firestore();

// NOVA SOLICITAÇÃO
function solicitarMaterial() {
  const doca = docaEl.value;
  const solicitante = solicitanteEl.value;
  const posicao = posicaoEl.value.trim();
  const partnumber = partnumberEl.value.trim();
  const quantidade = Number(quantidadeEl.value);
  const usoCarro = usoCarroEl.value.trim();

  if (!doca || !solicitante || !posicao || !partnumber || !quantidade || !usoCarro) {
    alert("Preencha todos os campos");
    return;
  }

  db.collection("solicitacoes").add({
    doca, solicitante, posicao, partnumber,
    quantidade, usoCarro,
    solicitadoEm: new Date(),
    status: "PENDENTE"
  });

  [docaEl, solicitanteEl, posicaoEl, partnumberEl, quantidadeEl, usoCarroEl]
    .forEach(e => e.value = "");
}

// ELEMENTOS
const docaEl = document.getElementById("doca");
const solicitanteEl = document.getElementById("solicitante");
const posicaoEl = document.getElementById("posicao");
const partnumberEl = document.getElementById("partnumber");
const quantidadeEl = document.getElementById("quantidade");
const usoCarroEl = document.getElementById("usoCarro");

// PENDENTES + KPI
db.collection("solicitacoes")
.orderBy("solicitadoEm", "desc")
.onSnapshot(snapshot => {
  const lista = document.getElementById("lista");
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
        <td data-label="Uso por Carro">${d.usoCarro}</td>
        <td data-label="Solicitado em">${s.toLocaleString()}</td>
        <td data-label="Atraso" data-solicitado="${s.toISOString()}"></td>
        <td><input id="c-${doc.id}" placeholder="Comentário"></td>
        <td><button onclick="confirmar('${doc.id}')">Abastecido</button></td>
      </tr>
    `;
  });

  document.getElementById("kpiPendentes").innerText = total;
  atualizarGrafico();
});

// CONFIRMAR
function confirmar(id) {
  const comentario = document.getElementById(`c-${id}`).value || "";
  db.collection("solicitacoes").doc(id).update({
    status: "FINALIZADO",
    comentario,
    abastecidoEm: new Date()
  });
}

// CRONÔMETRO
setInterval(() => {
  document.querySelectorAll("[data-solicitado]").forEach(el => {
    const ini = new Date(el.dataset.solicitado);
    const s = Math.floor((new Date() - ini) / 1000);
    el.innerText = `${Math.floor(s/60)}m ${s%60}s`;
  });
}, 1000);

// FILTRO
function filtrarPorData() {
  const data = filtroData.value;
  if (!data) return alert("Selecione a data");

  const ini = new Date(data+"T00:00");
  const fim = new Date(data+"T23:59");
  historico.innerHTML = "";

  db.collection("solicitacoes")
  .where("status","==","FINALIZADO")
  .get()
  .then(snap => {
    snap.forEach(doc => {
      const d = doc.data();
      const ab = d.abastecidoEm.toDate();
      if (ab >= ini && ab <= fim) {
        historico.innerHTML += `
          <tr class="finalizado">
            <td>${d.doca}</td>
            <td>${d.solicitante}</td>
            <td>${d.posicao}</td>
            <td>${d.partnumber}</td>
            <td>${d.quantidade}</td>
            <td>${d.usoCarro}</td>
            <td>${d.solicitadoEm.toDate().toLocaleString()}</td>
            <td>${ab.toLocaleString()}</td>
            <td>${d.comentario || "-"}</td>
          </tr>
        `;
      }
    });
  });
}

// GRÁFICO
let grafico;
function atualizarGrafico() {
  db.collection("solicitacoes")
  .where("status","==","FINALIZADO")
  .get()
  .then(snap => {
    const dados = {};
    snap.forEach(d => {
      const dia = d.data().abastecidoEm.toDate().toLocaleDateString("pt-BR");
      dados[dia] = (dados[dia] || 0) + 1;
    });

    if (grafico) grafico.destroy();
    grafico = new Chart(graficoDiario, {
      type: "bar",
      data: { labels: Object.keys(dados), datasets:[{ data:Object.values(dados), backgroundColor:"#2563eb"}]},
      options:{ responsive:true }
    });
  });
}
