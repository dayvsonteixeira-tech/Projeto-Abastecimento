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

// NOVA SOLICITAÇÃO
function solicitarMaterial() {
  const posicao = document.getElementById("posicao").value;
  const partnumber = document.getElementById("partnumber").value;

  if (!posicao || !partnumber) {
    alert("Preencha todos os campos");
    return;
  }

  db.collection("solicitacoes").add({
    posicao,
    partnumber,
    solicitadoEm: new Date(),
    abastecidoEm: null
  });

  document.getElementById("posicao").value = "";
  document.getElementById("partnumber").value = "";
}

// FORMATA TEMPO EM MM:SS
function formatarTempo(ms) {
  const total = Math.floor(ms / 1000);
  const min = Math.floor(total / 60);
  const seg = total % 60;
  return `${min}m ${seg.toString().padStart(2, "0")}s`;
}

// ATUALIZA LISTAS
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

      if (!d.abastecidoEm) {
        lista.innerHTML += `
          <tr class="pendente">
            <td>${d.posicao}</td>
            <td>${d.partnumber}</td>
            <td>${solicitado.toLocaleString()}</td>
            <td data-solicitado="${solicitado.toISOString()}"></td>
            <td>PENDENTE</td>
            <td><button onclick="confirmar('${doc.id}')">Abastecido</button></td>
          </tr>
        `;
      } else {
        historico.innerHTML += `
          <tr class="finalizado">
            <td>${d.posicao}</td>
            <td>${d.partnumber}</td>
            <td>${solicitado.toLocaleString()}</td>
            <td>${d.abastecidoEm.toDate().toLocaleString()}</td>
            <td>FINALIZADO</td>
          </tr>
        `;
      }
    });
  });

// CONFIRMAR ABASTECIMENTO
function confirmar(id) {
  db.collection("solicitacoes").doc(id).update({
    abastecidoEm: new Date()
  });
}

// ⏱️ CRONÔMETRO EM TEMPO REAL (SEGUNDO A SEGUNDO)
setInterval(() => {
  document.querySelectorAll("[data-solicitado]").forEach(el => {
    const solicitado = new Date(el.dataset.solicitado);
    const atraso = new Date() - solicitado;
    el.innerText = formatarTempo(atraso);
  });
}, 1000);
