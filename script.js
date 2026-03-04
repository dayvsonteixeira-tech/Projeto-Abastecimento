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
    doca, solicitante, posicao, partnumber, quantidade, usoCarro,
    solicitadoEm: new Date(),
    status: "PENDENTE",
    comentario: "",
    abastecidoEm: null
  });

  [docaEl, solicitanteEl, posicaoEl, partnumberEl, quantidadeEl, usoCarroEl]
    .forEach(el => el.value = "");
}

// ELEMENTOS
const docaEl = document.getElementById("doca");
const solicitanteEl = document.getElementById("solicitante");
const posicaoEl = document.getElementById("posicao");
const partnumberEl = document.getElementById("partnumber");
const quantidadeEl = document.getElementById("quantidade");
const usoCarroEl = document.getElementById("usoCarro");

// LISTA PENDENTES
db.collection("solicitacoes").orderBy("solicitadoEm", "desc")
.onSnapshot(snapshot => {
  const lista = document.getElementById("lista");
  const kpi = document.getElementById("kpiPendentes");

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
        <td data-label="Comentário"><input id="c-${doc.id}"></td>
        <td><button onclick="confirmar('${doc.id}')">Abastecido</button></td>
      </tr>`;
  });

  kpi.innerText = total || 0;
});

// CONFIRMAR
function confirmar(id) {
  const comentario = document.getElementById(`c-${id}`).value;
  db.collection("solicitacoes").doc(id).update({
    status: "FINALIZADO",
    comentario,
    abastecidoEm: new Date()
  });
}

// CRONÔMETRO
setInterval(() => {
  document.querySelectorAll("[data-solicitado]").forEach(el => {
    const inicio = new Date(el.dataset.solicitado);
    const diff = Date.now() - inicio;
    const m = Math.floor(diff / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    el.innerText = `${m}m ${s}s`;
  });
}, 1000);
