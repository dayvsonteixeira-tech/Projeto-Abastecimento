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
  const posicao = document.getElementById("posicao").value;
  const partnumber = document.getElementById("partnumber").value;
  const comentarios = document.getElementById("comentarios").value;

  if (!doca || !solicitante || !posicao || !partnumber) {
    alert("Preencha os campos obrigatórios");
    return;
  }

  db.collection("solicitacoes").add({
    doca,
    solicitante,
    posicao,
    partnumber,
    comentarios,
    solicitadoEm: new Date(),
    abastecidoEm: null,
    comentarioFinal: ""
  });

  ["doca","solicitante","posicao","partnumber","comentarios"]
    .forEach(id => document.getElementById(id).value = "");
}

// ===============================
// FORMATAR TEMPO (HORAS, MINUTOS E SEGUNDOS)
// ===============================
function formatarTempo(ms) {
  const totalSegundos = Math.floor(ms / 1000);

  const horas = Math.floor(totalSegundos / 3600);
  const minutos = Math.floor((totalSegundos % 3600) / 60);
  const segundos = totalSegundos % 60;

  if (horas > 0) {
    return `${horas}h ${minutos}m ${segundos}s`;
  } else {
    return `${minutos}m ${segundos}s`;
  }
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

      if (!d.abastecidoEm) {
        lista.innerHTML += `
          if (!d.abastecidoEm) {
  lista.innerHTML += `
    <tr class="pendente">
      <td>${d.doca}</td>
      <td>${d.solicitante}</td>
      <td>${d.posicao}</td>
      <td>${d.partnumber}</td>
      <td data-solicitado="${solicitado.toISOString()}"></td>
      <td>PENDENTE</td>
      <td>
        <input 
          placeholder="Comentário"
          onblur="salvarComentario('${doc.id}', this.value)"
        >
        <button onclick="confirmar('${doc.id}')">Abastecido</button>
      </td>
    </tr>
  `;
}else {
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

    atualizarGraficos();
  });

// ===============================
// CONFIRMAR ABASTECIMENTO
// ===============================
function confirmar(id) {
  db.collection("solicitacoes").doc(id).update({
    abastecidoEm: new Date()
  });
}

// ===============================
// CRONÔMETRO EM TEMPO REAL
// ===============================
setInterval(() => {
  document.querySelectorAll("[data-solicitado]").forEach(el => {
    const solicitado = new Date(el.dataset.solicitado);
    const atraso = new Date() - solicitado;
    el.innerText = formatarTempo(atraso);
  });
}, 1000);

// ===============================
// EXPORTAR PARA EXCEL
// ===============================
function exportarExcel() {
  db.collection("solicitacoes")
    .where("abastecidoEm", "!=", null)
    .get()
    .then(snapshot => {
      let csv = "Posição;Partnumber;Solicitado em;Abastecido em;Status\n";

      snapshot.forEach(doc => {
        const d = doc.data();
        csv += `${d.posicao};${d.partnumber};` +
               `${d.solicitadoEm.toDate().toLocaleString()};` +
               `${d.abastecidoEm.toDate().toLocaleString()};FINALIZADO\n`;
      });

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "historico_abastecimento.csv";
      link.click();
    });
}

// ===============================
// FILTRO POR DATA (CALENDÁRIO)
// ===============================
function filtrarHistorico() {
  const dataSelecionada = document.getElementById("filtroData").value;
  if (!dataSelecionada) return;

  const inicio = new Date(dataSelecionada + "T00:00:00");
  const fim = new Date(dataSelecionada + "T23:59:59");

  db.collection("solicitacoes")
    .where("abastecidoEm", ">=", inicio)
    .where("abastecidoEm", "<=", fim)
    .get()
    .then(snapshot => {
      const historico = document.getElementById("historico");
      historico.innerHTML = "";

      snapshot.forEach(doc => {
        const d = doc.data();
        historico.innerHTML += `
          <tr class="finalizado">
            <td>${d.posicao}</td>
            <td>${d.partnumber}</td>
            <td>${d.solicitadoEm.toDate().toLocaleString()}</td>
            <td>${d.abastecidoEm.toDate().toLocaleString()}</td>
            <td>FINALIZADO</td>
          </tr>
        `;
      });
    });
}

// ===============================
// GRÁFICOS
// ===============================
let graficoDia;
let graficoMes;

function atualizarGraficos() {
  db.collection("solicitacoes")
    .where("abastecidoEm", "!=", null)
    .get()
    .then(snapshot => {
      const porDia = {};
      const porMes = {};

      snapshot.forEach(doc => {
        const data = doc.data().abastecidoEm.toDate();
        const dia = data.toLocaleDateString();
        const mes = `${data.getMonth() + 1}/${data.getFullYear()}`;

        porDia[dia] = (porDia[dia] || 0) + 1;
        porMes[mes] = (porMes[mes] || 0) + 1;
      });

      gerarGraficoDiario(porDia);
      gerarGraficoMensal(porMes);
    });
}

function gerarGraficoDiario(dados) {
  const ctx = document.getElementById("graficoDiario");

  if (graficoDia) graficoDia.destroy();

  graficoDia = new Chart(ctx, {
    type: "bar",
    data: {
      labels: Object.keys(dados),
      datasets: [{
        label: "Abastecimentos por Dia",
        data: Object.values(dados)
      }]
    }
  });
}

function gerarGraficoMensal(dados) {
  const ctx = document.getElementById("graficoMensal");

  if (graficoMes) graficoMes.destroy();

  graficoMes = new Chart(ctx, {
    type: "line",
    data: {
      labels: Object.keys(dados),
      datasets: [{
        label: "Abastecimentos por Mês",
        data: Object.values(dados),
        tension: 0.3
      }]
    }
  });
}

// ===============================
// DASHBOARD EXECUTIVO
// ===============================
function atualizarDashboard(snapshot) {
  let pendentes = 0;

  snapshot.forEach(doc => {
    const d = doc.data();
    if (!d.abastecidoEm) pendentes++;
  });

  document.getElementById("kpiPendentes").innerText = pendentes;
}

// INICIA O DASHBOARD
atualizarDashboard();

// Salvar Comentario 

function salvarComentario(id, texto) {
  db.collection("solicitacoes").doc(id).update({
    comentarioFinal: texto
  });
}
