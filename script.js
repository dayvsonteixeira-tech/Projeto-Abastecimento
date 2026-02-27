script.js

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

// FORMATAR TEMPO
function formatarTempo(ms) {
  const total = Math.floor(ms / 1000);
  const min = Math.floor(total / 60);
  const seg = total % 60;
  return `${min}m ${seg}s`;
}

// ATUALIZA TABELAS EM TEMPO REAL
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

      // EM ANDAMENTO
      if (!d.abastecidoEm) {
        const atraso = new Date() - solicitado;

        lista.innerHTML += `
          <tr class="pendente">
            <td>${d.posicao}</td>
            <td>${d.partnumber}</td>
            <td>${solicitado.toLocaleString()}</td>
            <td>${formatarTempo(atraso)}</td>
            <td>PENDENTE</td>
            <td><button onclick="confirmar('${doc.id}')">Abastecido</button></td>
          </tr>
        `;
      } 
      // HISTÓRICO FINALIZADO
      else {
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

// CRONÔMETRO CONTÍNUO
setInterval(() => {
  db.collection("solicitacoes")
    .where("abastecidoEm", "==", null)
    .get()
    .then(() => {});
}, 1000);
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

// ATUALIZA GRÁFICOS SEMPRE QUE HOUVER MUDANÇA
db.collection("solicitacoes").onSnapshot(() => {
  atualizarGraficos();
});

// EXPORTAR HISTÓRICO PARA EXCEL
function exportarExcel() {
  db.collection("solicitacoes").where("abastecidoEm", "!=", null).get()
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
