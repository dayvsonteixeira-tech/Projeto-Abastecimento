// ===============================
// FIREBASE CONFIG
// ===============================
const firebaseConfig = {
  apiKey: "AIzaSyDgpRxB7gluCbqEnFHIf68xDQVRmAp0dBo",
  authDomain: "controle-abastecimento-f80ed.firebaseapp.com",
  projectId: "controle-abastecimento-f80ed",
  storageBucket: "controle-abastecimento-f80ed.firebasestorage.app",
  messagingSenderId: "129218813008",
  appId: "1:129218813008:web:b1f665fbcd9b3a777a0555"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ===============================
// NOVA SOLICITAÇÃO
// ===============================
function solicitarMaterial() {
  const doca = document.getElementById("doca").value;
  const solicitante = document.getElementById("solicitante").value;
  const posicao = document.getElementById("posicao").value.trim();
  const partnumber = document.getElementById("partnumber").value.trim();
  const quantidade = Number(document.getElementById("quantidade").value);
  const usoCarro = document.getElementById("usoCarro").value.trim();

  if (!doca || !solicitante || !posicao || !partnumber || !quantidade || !usoCarro) {
    alert("Preencha todos os campos");
    return;
  }

  db.collection("solicitacoes").add({
    doca,
    solicitante,
    posicao,
    partnumber,
    quantidade,
    usoCarro,
    solicitadoEm: new Date(),
    abastecidoEm: null,
    comentario: "",
    status: "PENDENTE"
  });

  ["doca","solicitante","posicao","partnumber","quantidade","usoCarro"]
    .forEach(id => document.getElementById(id).value = "");
}

// ===============================
// FORMATAR TEMPO
// ===============================
function formatarTempo(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0 ? `${h}h ${m}m ${sec}s` : `${m}m ${sec}s`;
}

// ===============================
// LISTA PENDENTES
// ===============================
db.collection("solicitacoes")
  .orderBy("solicitadoEm", "desc")
  .onSnapshot(snapshot => {

    const lista = document.getElementById("lista");
    const kpi = document.getElementById("kpiPendentes");

    lista.innerHTML = "";
    let total = 0;

    snapshot.forEach(doc => {
      const d = doc.data();
      if (d.status !== "PENDENTE") return;

      total++;
      const solicitado = d.solicitadoEm.toDate();

      lista.innerHTML += `
        <tr>
          <td>${d.doca}</td>
          <td>${d.solicitante}</td>
          <td>${d.posicao}</td>
          <td>${d.partnumber}</td>
          <td>${d.quantidade}</td>
          <td>${d.usoCarro}</td>
          <td>${solicitado.toLocaleString()}</td>
          <td data-solicitado="${solicitado.toISOString()}"></td>
          <td><input id="comentario-${doc.id}" placeholder="Comentário"></td>
          <td><button onclick="confirmar('${doc.id}')">Abastecido</button></td>
        </tr>
      `;
    });

    kpi.innerText = total;

    if (!total) {
      lista.innerHTML = `<tr><td colspan="10">Nenhuma solicitação pendente</td></tr>`;
    }

    atualizarGrafico();
  });

// ===============================
// CONFIRMAR
// ===============================
function confirmar(id) {
  const comentario = document.getElementById(`comentario-${id}`).value;

  db.collection("solicitacoes").doc(id).update({
    abastecidoEm: new Date(),
    comentario,
    status: "FINALIZADO"
  });
}

// ===============================
// CRONÔMETRO
// ===============================
setInterval(() => {
  document.querySelectorAll("[data-solicitado]").forEach(el => {
    el.innerText = formatarTempo(new Date() - new Date(el.dataset.solicitado));
  });
}, 1000);

// ===============================
// HISTÓRICO
// ===============================
function filtrarPorData() {
  const data = document.getElementById("filtroData").value;
  const inicio = new Date(data + "T00:00");
  const fim = new Date(data + "T23:59");

  const historico = document.getElementById("historico");
  historico.innerHTML = "";

  db.collection("solicitacoes")
    .where("status", "==", "FINALIZADO")
    .get()
    .then(snapshot => {
      snapshot.forEach(doc => {
        const d = doc.data();
        const ab = d.abastecidoEm.toDate();

        if (ab >= inicio && ab <= fim) {
          historico.innerHTML += `
            <tr>
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

// ===============================
// GRÁFICO
// ===============================
let grafico;
function atualizarGrafico() {
  db.collection("solicitacoes")
    .where("status", "==", "FINALIZADO")
    .get()
    .then(snapshot => {

      const dados = {};
      snapshot.forEach(doc => {
        const d = doc.data().abastecidoEm.toDate().toLocaleDateString("pt-BR");
        dados[d] = (dados[d] || 0) + 1;
      });

      if (grafico) grafico.destroy();

      grafico = new Chart(document.getElementById("graficoDiario"), {
        type: "bar",
        data: {
          labels: Object.keys(dados),
          datasets: [{
            data: Object.values(dados),
            backgroundColor: "#2563eb"
          }]
        },
        options: { responsive: true }
      });
    });
}
