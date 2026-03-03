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
    status: "PENDENTE"
  });

  [docaEl, solicitanteEl, posicaoEl, partnumberEl, quantidadeEl]
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
const lista = document.getElementById("lista");
const historico = document.getElementById("historico");

// ===============================
// LISTA PENDENTES
// ===============================
db.collection("solicitacoes")
  .where("status", "==", "PENDENTE")
  .orderBy("solicitadoEm", "desc")
  .onSnapshot(snapshot => {

    lista.innerHTML = "";

    snapshot.forEach(doc => {
      const d = doc.data();
      lista.innerHTML += `
        <tr>
          <td>${d.doca}</td>
          <td>${d.solicitante}</td>
          <td>${d.posicao}</td>
          <td>${d.partnumber}</td>
          <td>${d.quantidade}</td>
          <td>${d.solicitadoEm.toDate().toLocaleString()}</td>
          <td>
            <button onclick="confirmar('${doc.id}')">Abastecido</button>
          </td>
        </tr>
      `;
    });
  });

// ===============================
// CONFIRMAR
// ===============================
function confirmar(id) {
  db.collection("solicitacoes").doc(id).update({
    abastecidoEm: new Date(),
    status: "FINALIZADO"
  });
}

// ===============================
// HISTÓRICO HOJE
// ===============================
function mostrarHistoricoHoje() {
  historico.innerHTML = "";

  const inicio = new Date();
  inicio.setHours(0, 0, 0, 0);

  const fim = new Date();
  fim.setHours(23, 59, 59, 999);

  carregarHistorico(inicio, fim);
}

// ===============================
// FILTRAR DATA
// ===============================
function filtrarHistorico() {
  const data = document.getElementById("filtroData").value;
  if (!data) {
    alert("Selecione uma data");
    return;
  }

  const inicio = new Date(data + "T00:00:00");
  const fim = new Date(data + "T23:59:59");

  carregarHistorico(inicio, fim);
}

// ===============================
// FUNÇÃO ÚNICA DE HISTÓRICO
// ===============================
function carregarHistorico(inicio, fim) {
  historico.innerHTML = "";

  db.collection("solicitacoes")
    .where("status", "==", "FINALIZADO")
    .get()
    .then(snapshot => {

      let achou = false;

      snapshot.forEach(doc => {
        const d = doc.data();
        const data = d.abastecidoEm.toDate();

        if (data >= inicio && data <= fim) {
          achou = true;

          historico.innerHTML += `
            <tr>
              <td>${d.doca}</td>
              <td>${d.solicitante}</td>
              <td>${d.posicao}</td>
              <td>${d.partnumber}</td>
              <td>${d.quantidade}</td>
              <td>${d.abastecidoEm.toDate().toLocaleString()}</td>
              <td>FINALIZADO</td>
            </tr>
          `;
        }
      });

      if (!achou) {
        historico.innerHTML = `
          <tr>
            <td colspan="7" style="text-align:center">
              Nenhum registro encontrado
            </td>
          </tr>
        `;
      }
    });
}
