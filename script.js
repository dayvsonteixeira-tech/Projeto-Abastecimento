// 🔥 CONFIGURE COM OS DADOS DO SEU FIREBASE
const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  projectId: "SEU_PROJETO"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// SOLICITAR MATERIAL
document.getElementById("form").addEventListener("submit", e => {
  e.preventDefault();

  db.collection("pedidos").add({
    posicao: posicao.value,
    partnumber: partnumber.value,
    solicitadoEm: new Date(),
    abastecido: false,
    abastecidoEm: null
  });

  e.target.reset();
});

// ATUALIZA EM TEMPO REAL
db.collection("pedidos")
  .orderBy("solicitadoEm", "desc")
  .onSnapshot(snapshot => {
    lista.innerHTML = "";
    historico.innerHTML = "";

    snapshot.forEach(doc => {
      const r = doc.data();
      const id = doc.id;
      const solicitadoEm = r.solicitadoEm.toDate();

      const agora = new Date();
      const atrasoMin = Math.floor((agora - solicitadoEm) / 60000);

      const li = document.createElement("li");

      li.innerHTML = `
        <strong>Posição:</strong> ${r.posicao}<br>
        <strong>Partnumber:</strong> ${r.partnumber}<br>
        <strong>Solicitado:</strong> ${solicitadoEm.toLocaleString()}<br>
        ${!r.abastecido
          ? `<strong>⏱️ Atraso:</strong> ${atrasoMin} min<br>
             <button onclick="confirmar('${id}')">✅ Confirmar Abastecimento</button>`
          : `<strong>Abastecido em:</strong> ${r.abastecidoEm.toDate().toLocaleString()}`
        }
      `;

      r.abastecido ? historico.appendChild(li) : lista.appendChild(li);
    });
  });

// CONFIRMAR ABASTECIMENTO
function confirmar(id) {
  db.collection("pedidos").doc(id).update({
    abastecido: true,
    abastecidoEm: new Date()
  });
}
