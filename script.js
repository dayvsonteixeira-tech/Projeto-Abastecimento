// ===============================
// FIREBASE
// ===============================
firebase.initializeApp({
  apiKey: "AIzaSyDgpRxB7gluCbqEnFHIf68xDQVRmAp0dBo",
  authDomain: "controle-abastecimento-f80ed.firebaseapp.com",
  projectId: "controle-abastecimento-f80ed"
});

const db = firebase.firestore();

// ===============================
// NOVA SOLICITAÇÃO
// ===============================
function solicitarMaterial() {
  const doca = doca.value.trim();
  const solicitante = solicitante.value.trim();
  const posicao = posicao.value.trim();
  const partnumber = partnumber.value.trim();
  const quantidade = Number(quantidade.value);

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

  ["doca","solicitante","posicao","partnumber","quantidade"]
    .forEach(id => document.getElementById(id).value = "");
}

// ===============================
// FORMATAR TEMPO
// ===============================
function formatarTempo(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}h ${m%60}m` : `${m}m ${s%60}s`;
}

// ===============================
// LISTA + KPI + CRONÔMETRO
// ===============================
db.collection("solicitacoes")
  .orderBy("solicitadoEm", "desc")
  .onSnapshot(snapshot => {

    const lista = document.getElementById("lista");
    lista.innerHTML = "";

    let pendentes = 0;

    snapshot.forEach(doc => {
      const d = doc.data();
      if (d.status !== "PENDENTE") return;

      pendentes++;
      const solicitado = d.solicitadoEm.toDate();

      lista.innerHTML += `
        <tr>
          <td>${d.doca}</td>
          <td>${d.solicitante}</td>
          <td>${d.posicao}</td>
          <td>${d.partnumber}</td>
          <td>${d.quantidade}</td>
          <td>${solicitado.toLocaleString()}</td>
          <td data-solicitado="${solicitado.toISOString()}">...</td>
          <td>
            <input id="comentario-${doc.id}" placeholder="Comentário">
          </td>
          <td>
            <button onclick="confirmar('${doc.id}')">Abastecido</button>
          </td>
        </tr>
      `;
    });

    document.getElementById("kpiPendentes").innerText = pendentes;

    if (pendentes === 0) {
      lista.innerHTML = `
        <tr>
          <td colspan="9" style="text-align:center">
            Nenhuma solicitação pendente
          </td>
        </tr>
      `;
    }
  });

// ===============================
// CRONÔMETRO
// ===============================
setInterval(() => {
  document.querySelectorAll("[data-solicitado]").forEach(el => {
    const inicio = new Date(el.dataset.solicitado);
    el.innerText = formatarTempo(Date.now() - inicio);
  });
}, 1000);

// ===============================
// CONFIRMAR
// ===============================
function confirmar(id) {
  const comentario =
    document.getElementById(`comentario-${id}`)?.value || "";

  db.collection("solicitacoes").doc(id).update({
    status: "FINALIZADO",
    comentario,
    abastecidoEm: new Date()
  });
}
// ===============================
// FILTRAR HISTÓRICO POR DATA
// ===============================
function filtrarHistorico() {
  const data = document.getElementById("filtroData").value;
  if (!data) {
    alert("Selecione uma data");
    return;
  }

  const inicio = new Date(data + "T00:00:00");
  const fim = new Date(data + "T23:59:59");

  historico.innerHTML = "";

  db.collection("solicitacoes")
    .where("status", "==", "FINALIZADO")
    .get()
    .then(snapshot => {
      let encontrou = false;

      snapshot.forEach(doc => {
        const d = doc.data();
        const abastecido = d.abastecidoEm.toDate();

        if (abastecido >= inicio && abastecido <= fim) {
          encontrou = true;

          historico.innerHTML += `
            <tr>
              <td>${d.doca}</td>
              <td>${d.solicitante}</td>
              <td>${d.posicao}</td>
              <td>${d.partnumber}</td>
              <td>${d.quantidade}</td>
              <td>${d.solicitadoEm.toDate().toLocaleString()}</td>
              <td>${abastecido.toLocaleString()}</td>
              <td>FINALIZADO</td>
            </tr>
          `;
        }
      });

      if (!encontrou) {
        historico.innerHTML = `
          <tr>
            <td colspan="8" style="text-align:center;">
              Nenhum registro encontrado
            </td>
          </tr>
        `;
      }
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
      let csv = "Doca;Solicitante;Posição;Partnumber;Qtd;Solicitado;Abastecido\n";

      snapshot.forEach(doc => {
        const d = doc.data();
        csv += `${d.doca};${d.solicitante};${d.posicao};${d.partnumber};${d.quantidade};` +
               `${d.solicitadoEm.toDate().toLocaleString()};` +
               `${d.abastecidoEm.toDate().toLocaleString()}\n`;
      });

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "historico_abastecimento.csv";
      link.click();
    });
}
