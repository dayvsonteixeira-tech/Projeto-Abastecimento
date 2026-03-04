// ===============================
// FIREBASE
// ===============================
const firebaseConfig = {
  apiKey: "AIzaSyDgpRxB7gluCbqEnFHIf68xDQVRmAp0dBo",
  authDomain: "controle-abastecimento-f80ed.firebaseapp.com",
  projectId: "controle-abastecimento-f80ed",
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ===============================
// NOVA SOLICITAÇÃO
// ===============================
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

  [docaEl, solicitanteEl, posicaoEl, partnumberEl, quantidadeEl, usoCarroEl]
    .forEach(el => el.value = "");
}

// ===============================
// ELEMENTOS
// ===============================
const docaEl = document.getElementById("doca");
const solicitanteEl = document.getElementById("solicitante");
const posicaoEl = document.getElementById("posicao");
const partnumberEl = document.getElementById("partnumber");
const quantidadeEl = document.getElementById("quantidade");
const usoCarroEl = document.getElementById("usoCarro");

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
        <tr class="pendente">
          <td>${d.doca}</td>
          <td>${d.solicitante}</td>
          <td>${d.posicao}</td>
          <td>${d.partnumber}</td>
          <td>${d.quantidade}</td>
          <td>${d.usoCarro}</td>
          <td>${solicitado.toLocaleString()}</td>
          <td data-solicitado="${solicitado.toISOString()}"></td>
          <td><input id="comentario-${doc.id}"></td>
          <td><button onclick="confirmar('${doc.id}')">Abastecido</button></td>
        </tr>
      `;
    });

    kpi.innerText = total;
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
// FILTRO HISTÓRICO
// ===============================
function filtrarPorData() {
  const data = document.getElementById("filtroData").value;
  if (!data) return alert("Selecione uma data");

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

// ===============================
// EXPORTAR EXCEL
// ===============================
function exportarExcel() {
  let csv = "Doca,Solicitante,Posição,Partnumber,Quantidade,Uso por Carro,Solicitado,Abastecido,Comentário\n";

  db.collection("solicitacoes")
    .where("status", "==", "FINALIZADO")
    .get()
    .then(snapshot => {
      snapshot.forEach(doc => {
        const d = doc.data();
        csv += `${d.doca},${d.solicitante},${d.posicao},${d.partnumber},${d.quantidade},${d.usoCarro},${d.solicitadoEm.toDate().toLocaleString()},${d.abastecidoEm.toDate().toLocaleString()},${d.comentario}\n`;
      });

      const blob = new Blob([csv], { type: "text/csv" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "historico_abastecimento.csv";
      a.click();
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
        const data = doc.data().abastecidoEm.toDate().toLocaleDateString("pt-BR");
        dados[data] = (dados[data] || 0) + 1;
      });

      if (grafico) grafico.destroy();

      grafico = new Chart(graficoDiario, {
        type: "bar",
        data: {
          labels: Object.keys(dados),
          datasets: [{
            label: "Abastecimentos",
            data: Object.values(dados),
            backgroundColor: "#2563eb"
          }]
        },
        options: { responsive: true }
      });
    });
}
