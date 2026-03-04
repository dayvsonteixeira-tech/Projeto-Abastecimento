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
// LISTA DE PENDENTES (REALTIME)
// ===============================
db.collection("solicitacoes")
  .where("status", "==", "PENDENTE")
  .orderBy("solicitadoEm", "desc")
  .onSnapshot(snapshot => {
    const lista = document.getElementById("lista");
    lista.innerHTML = "";

    if (snapshot.empty) {
      lista.innerHTML = `
        <tr>
          <td colspan="9" style="text-align:center">
            Nenhuma solicitação pendente
          </td>
        </tr>
      `;
      return;
    }

    snapshot.forEach(doc => {
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
          <td data-solicitado="${solicitado.toISOString()}"></td>
          <td>
            <input id="comentario-${doc.id}" placeholder="Comentário">
          </td>
          <td>
            <button onclick="confirmar('${doc.id}')">
              Abastecido
            </button>
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
// FILTRAR HISTÓRICO POR DATA
// ===============================
function filtrarPorData() {
  const data = document.getElementById("filtroData").value;
  const historico = document.getElementById("historico");

  if (!data) {
    alert("Selecione uma data");
    return;
  }

  const inicio = new Date(data + "T00:00:00");
  const fim = new Date(data + "T23:59:59");

  historico.innerHTML = `
    <tr>
      <td colspan="8" style="text-align:center">
        Carregando...
      </td>
    </tr>
  `;

  db.collection("solicitacoes")
    .where("status", "==", "FINALIZADO")
    .get()
    .then(snapshot => {
      historico.innerHTML = "";
      let encontrou = false;

      snapshot.forEach(doc => {
        const d = doc.data();
        const abastecido = d.abastecidoEm.toDate();

        if (abastecido >= inicio && abastecido <= fim) {
          encontrou = true;

          historico.innerHTML += `
            <tr class="finalizado">
              <td>${d.doca}</td>
              <td>${d.solicitante}</td>
              <td>${d.posicao}</td>
              <td>${d.partnumber}</td>
              <td>${d.quantidade}</td>
              <td>${d.solicitadoEm.toDate().toLocaleString()}</td>
              <td>${abastecido.toLocaleString()}</td>
              <td>${d.comentario || "-"}</td>
            </tr>
          `;
        }
      });

      if (!encontrou) {
        historico.innerHTML = `
          <tr>
            <td colspan="8" style="text-align:center">
              Nenhum registro encontrado
            </td>
          </tr>
        `;
      }
    });
}
