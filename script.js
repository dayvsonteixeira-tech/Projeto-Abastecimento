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
  const doca = document.getElementById("doca").value.trim();
  const solicitante = document.getElementById("solicitante").value.trim();
  const posicao = document.getElementById("posicao").value.trim();
  const partnumber = document.getElementById("partnumber").value.trim();
  const quantidade = Number(document.getElementById("quantidade").value);

  if (!doca || !solicitante || !posicao || !partnumber || !quantidade) {
    alert("Preencha todos os campos");
    return;
  }

  db.collection("solicitacoes").add({
    doca,
    solicitante,
    posicao,
    partnumber,
    quantidade,
    solicitadoEm: new Date(),
    abastecidoEm: null,
    comentario: "",
    status: "PENDENTE"
  });

  ["doca", "solicitante", "posicao", "partnumber", "quantidade"]
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
// LISTA DE PENDENTES (TEMPO REAL)
// ===============================
db.collection("solicitacoes")
  .where("status", "==", "PENDENTE")
  .orderBy("solicitadoEm", "desc")
  .onSnapshot(snapshot => {

    const lista = document.getElementById("lista");
    lista.innerHTML = "";

    snapshot.forEach(doc => {
      const d = doc.data();
      const solicitado = d.solicitadoEm.toDate();

      lista.innerHTML += `
        <tr class="pendente">
          <td data-label="Doca">${d.doca}</td>
          <td data-label="Solicitante">${d.solicitante}</td>
          <td data-label="Posição">${d.posicao}</td>
          <td data-label="Partnumber">${d.partnumber}</td>
          <td data-label="Qtd">${d.quantidade}</td>
          <td data-label="Solicitado">${solicitado.toLocaleString()}</td>
          <td data-label="Atraso" data-solicitado="${solicitado.toISOString()}"></td>
          <td data-label="Comentário">
            <input id="comentario-${doc.id}" placeholder="Comentário">
          </td>
          <td data-label="Ação">
            <button onclick="confirmar('${doc.id}')">Abastecido</button>
          </td>
        </tr>
      `;
    });
  });

// ===============================
// CONFIRMAR ABASTECIMENTO
// ===============================
function confirmar(id) {
  const comentario = document.getElementById(`comentario-${id}`).value.trim();

  db.collection("solicitacoes").doc(id).update({
    abastecidoEm: new Date(),
    comentario: comentario,
    status: "FINALIZADO"
  });
}

// ===============================
// CRONÔMETRO EM TEMPO REAL
// ===============================
setInterval(() => {
  document.querySelectorAll("[data-solicitado]").forEach(el => {
    const inicio = new Date(el.dataset.solicitado);
    el.innerText = formatarTempo(new Date() - inicio);
  });
}, 1000);

// ===============================
// DASHBOARD (PENDENTES)
// ===============================
db.collection("solicitacoes").onSnapshot(snapshot => {
  let pendentes = 0;

  snapshot.forEach(doc => {
    const d = doc.data();
    if (!d.abastecidoEm) pendentes++;
  });

  document.getElementById("kpiPendentes").innerText = pendentes;
});

// ===============================
// MOSTRAR HISTÓRICO DE HOJE
// ===============================
function mostrarHistoricoHoje() {
  const historico = document.getElementById("historico");
  historico.innerHTML = "";

  const inicio = new Date();
  inicio.setHours(0, 0, 0, 0);

  const fim = new Date();
  fim.setHours(23, 59, 59, 999);

  db.collection("solicitacoes")
    .where("status", "==", "FINALIZADO")
    .where("abastecidoEm", ">=", inicio)
    .where("abastecidoEm", "<=", fim)
    .orderBy("abastecidoEm", "desc")
    .get()
    .then(snapshot => {

      if (snapshot.empty) {
        historico.innerHTML = `
          <tr>
            <td colspan="8" style="text-align:center;">
              Nenhum registro hoje
            </td>
          </tr>`;
        return;
      }

      snapshot.forEach(doc => {
        const d = doc.data();

        historico.innerHTML += `
          <tr class="finalizado">
            <td>${d.doca}</td>
            <td>${d.solicitante}</td>
            <td>${d.posicao}</td>
            <td>${d.partnumber}</td>
            <td>${d.quantidade}</td>
            <td>${d.solicitadoEm.toDate().toLocaleString()}</td>
            <td>${d.abastecidoEm.toDate().toLocaleString()}</td>
            <td>FINALIZADO</td>
          </tr>
        `;
      });
    });
}

// ===============================
// FILTRAR HISTÓRICO POR DATA
// ===============================
function filtrarHistorico() {
  const data = document.getElementById("filtroData").value;
  if (!data) return;

  const historico = document.getElementById("historico");
  historico.innerHTML = "";

  const inicio = new Date(data + "T00:00:00");
  const fim = new Date(data + "T23:59:59");

  db.collection("solicitacoes")
    .where("status", "==", "FINALIZADO")
    .where("abastecidoEm", ">=", inicio)
    .where("abastecidoEm", "<=", fim)
    .orderBy("abastecidoEm", "desc")
    .get()
    .then(snapshot => {

      if (snapshot.empty) {
        historico.innerHTML = `
          <tr>
            <td colspan="8" style="text-align:center;">
              Nenhum registro nessa data
            </td>
          </tr>`;
        return;
      }

      snapshot.forEach(doc => {
        const d = doc.data();

        historico.innerHTML += `
          <tr class="finalizado">
            <td>${d.doca}</td>
            <td>${d.solicitante}</td>
            <td>${d.posicao}</td>
            <td>${d.partnumber}</td>
            <td>${d.quantidade}</td>
            <td>${d.solicitadoEm.toDate().toLocaleString()}</td>
            <td>${d.abastecidoEm.toDate().toLocaleString()}</td>
            <td>FINALIZADO</td>
          </tr>
        `;
      });
    });
}

// ===============================
// EXPORTAR EXCEL
// ===============================
function exportarExcel() {
  db.collection("solicitacoes")
    .where("status", "==", "FINALIZADO")
    .get()
    .then(snapshot => {

      let csv = "Doca;Solicitante;Posição;Partnumber;Qtd;Solicitado;Abastecido;Comentário\n";

      snapshot.forEach(doc => {
        const d = doc.data();
        csv += `${d.doca};${d.solicitante};${d.posicao};${d.partnumber};${d.quantidade};` +
               `${d.solicitadoEm.toDate().toLocaleString()};` +
               `${d.abastecidoEm.toDate().toLocaleString()};` +
               `"${d.comentario || ""}"\n`;
      });

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "historico_abastecimento.csv";
      link.click();
    });
}
