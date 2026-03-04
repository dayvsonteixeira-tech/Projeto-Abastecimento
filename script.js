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
// ELEMENTOS
// ===============================
const docaEl = document.getElementById("doca");
const solicitanteEl = document.getElementById("solicitante");
const posicaoEl = document.getElementById("posicao");
const partnumberEl = document.getElementById("partnumber");
const quantidadeEl = document.getElementById("quantidade");
const lista = document.getElementById("lista");
const historico = document.getElementById("historico");

// ===============================
// FORMATAR TEMPO
// ===============================
function formatarTempo(ms) {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;

  return h > 0
    ? `${h}h ${m}m ${sec}s`
    : `${m}m ${sec}s`;
}

// ===============================
// NOVA SOLICITAÇÃO
// ===============================
function solicitarMaterial() {
  const doca = docaEl.value.trim();
  const solicitante = solicitanteEl.value.trim();
  const posicao = posicaoEl.value.trim();
  const partnumber = partnumberEl.value.trim();
  const quantidade = Number(quantidadeEl.value);

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

  [docaEl, solicitanteEl, posicaoEl, partnumberEl, quantidadeEl]
    .forEach(el => el.value = "");
}

// ===============================
// LISTA DE PENDENTES (COM CRONÔMETRO)
// ===============================
db.collection("solicitacoes")
  .where("status", "==", "PENDENTE")
  .orderBy("solicitadoEm", "desc")
  .onSnapshot(snapshot => {

    lista.innerHTML = "";
    let pendentes = 0;

    snapshot.forEach(doc => {
      pendentes++;
      const d = doc.data();
      const solicitado = d.solicitadoEm.toDate();

      lista.innerHTML += `
        <tr class="pendente">
          <td>${d.doca}</td>
          <td>${d.solicitante}</td>
          <td>${d.posicao}</td>
          <td>${d.partnumber}</td>
          <td>${d.quantidade}</td>
          <td>${solicitado.toLocaleString()}</td>

          <!-- CRONÔMETRO -->
          <td data-solicitado="${solicitado.toISOString()}">
            00:00
          </td>

          <!-- COMENTÁRIO -->
          <td>
            <input
              id="comentario-${doc.id}"
              placeholder="Comentário"
            >
          </td>

          <!-- AÇÃO -->
          <td>
            <button onclick="confirmar('${doc.id}')">
              Abastecido
            </button>
          </td>
        </tr>
      `;
    });

    if (pendentes === 0) {
      lista.innerHTML = `
        <tr>
          <td colspan="9" style="text-align:center;">
            Nenhuma solicitação pendente
          </td>
        </tr>
      `;
    }

    document.getElementById("kpiPendentes").innerText = pendentes;
  });

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
// CONFIRMAR ABASTECIMENTO
// ===============================
function confirmar(id) {
  const comentarioInput = document.getElementById(`comentario-${id}`);
  const comentario = comentarioInput ? comentarioInput.value.trim() : "";

  db.collection("solicitacoes").doc(id).update({
    abastecidoEm: new Date(),
    comentario: comentario,
    status: "FINALIZADO"
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
