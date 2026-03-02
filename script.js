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

  if (!doca || !solicitante || !posicao || !partnumber) {
    alert("Preencha todos os campos");
    return;
  }

  db.collection("solicitacoes").add({
    doca,
    solicitante,
    posicao,
    partnumber,
    solicitadoEm: new Date(),
    abastecidoEm: null,
    comentario: "",
    status: "PENDENTE"
  });

  ["doca", "solicitante", "posicao", "partnumber"]
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
// LISTAS (ANDAMENTO + HISTÓRICO)
// ===============================
db.collection("solicitacoes")
  .orderBy("solicitadoEm", "desc")
  .onSnapshot(snapshot => {

    const lista = document.getElementById("lista");
    const historico = document.getElementById("historico");

    lista.innerHTML = "";
    historico.innerHTML = "";

    snapshot.forEach(doc => {
      const d = doc.data();
      const solicitado = d.solicitadoEm.toDate();

      if (d.status === "PENDENTE") {
        lista.innerHTML += `
          <tr class="pendente">
            <td>${d.doca}</td>
            <td>${d.solicitante}</td>
            <td>${d.posicao}</td>
            <td>${d.partnumber}</td>
            <td>${solicitado.toLocaleString()}</td>
            <td data-solicitado="${solicitado.toISOString()}"></td>
            <td>
              <input 
                id="comentario-${doc.id}" 
                placeholder="Comentário"
              >
            </td>
            <td>
              <button onclick="confirmar('${doc.id}')">
                Abastecido
              </button>
            </td>
          </tr>
        `;
      } else {
        historico.innerHTML += `
          <tr class="finalizado">
            <td>${d.doca}</td>
            <td>${d.solicitante}</td>
            <td>${d.posicao}</td>
            <td>${d.partnumber}</td>
            <td>${solicitado.toLocaleString()}</td>
            <td>${d.abastecidoEm.toDate().toLocaleString()}</td>
            <td>${d.comentario || "-"}</td>
          </tr>
        `;
      }
    });

    atualizarGraficos();
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
// EXPORTAR PARA EXCEL
// ===============================
function exportarExcel() {
  db.collection("solicitacoes")
    .where("status", "==", "FINALIZADO")
    .get()
    .then(snapshot => {
      let csv = "Doca;Solicitante;Posição;Partnumber;Solicitado;Abastecido;Comentário\n";

      snapshot.forEach(doc => {
        const d = doc.data();
        csv += `${d.doca};${d.solicitante};${d.posicao};${d.partnumber};` +
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

// ===============================
// GRÁFICOS
// ===============================
let graficoDia, graficoMes;

function atualizarGraficos() {
  db.collection("solicitacoes")
    .where("status", "==", "FINALIZADO")
    .get()
    .then(snapshot => {
      const porDia = {}, porMes = {};

      snapshot.forEach(doc => {
        const d = doc.data().abastecidoEm.toDate();
        const dia = d.toLocaleDateString();
        const mes = `${d.getMonth()+1}/${d.getFullYear()}`;

        porDia[dia] = (porDia[dia] || 0) + 1;
        porMes[mes] = (porMes[mes] || 0) + 1;
      });

      gerarGrafico("graficoDiario", "bar", porDia, g => graficoDia = g, graficoDia);
      gerarGrafico("graficoMensal", "line", porMes, g => graficoMes = g, graficoMes);
    });
}

function gerarGrafico(id, tipo, dados, set, ref) {
  const ctx = document.getElementById(id);
  if (ref) ref.destroy();
  set(new Chart(ctx, {
    type: tipo,
    data: {
      labels: Object.keys(dados),
      datasets: [{
        label: "Abastecimentos",
        data: Object.values(dados),
        tension: 0.3
      }]
    }
  }));
}

// ===============================
// DASHBOARD EXECUTIVO
// ===============================
db.collection("solicitacoes").onSnapshot(snapshot => {
  let total = 0, pendentes = 0, soma = 0, qtd = 0;

  snapshot.forEach(doc => {
    total++;
    const d = doc.data();
    if (d.status === "PENDENTE") pendentes++;
    else {
      soma += d.abastecidoEm.toDate() - d.solicitadoEm.toDate();
      qtd++;
    }
  });

  document.getElementById("kpiTotal").innerText = total;
  document.getElementById("kpiPendentes").innerText = pendentes;
  document.getElementById("kpiFinalizadas").innerText = total - pendentes;
  document.getElementById("kpiTempoMedio").innerText =
    qtd ? formatarTempo(soma / qtd) : "--";
});
