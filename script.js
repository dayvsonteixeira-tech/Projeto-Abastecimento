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
// ELEMENTOS
// ===============================
const posicaoEl = document.getElementById("posicao");
const partnumberEl = document.getElementById("partnumber");
const lista = document.getElementById("lista");
const historico = document.getElementById("historico");

// ===============================
// NOVA SOLICITAÇÃO
// ===============================
function solicitarMaterial(){

  const doca = document.getElementById("doca").value;
  const solicitante = document.getElementById("solicitante").value;
  const posicao = posicaoEl.value.trim();
  const partnumber = partnumberEl.value.trim();
  const quantidade = document.getElementById("quantidade").value;
  const usoCarro = document.getElementById("usoCarro").value;

  if(!doca || !solicitante || !posicao || !partnumber){
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
    solicitadoEm:new Date(),
    status:"PENDENTE"
  });

  posicaoEl.value="";
  partnumberEl.value="";
}

// ===============================
// LISTAR SOMENTE PENDENTES
// ===============================
db.collection("solicitacoes")
.where("status","==","PENDENTE")
.orderBy("solicitadoEm","desc")
.onSnapshot(snapshot=>{

  lista.innerHTML="";

  snapshot.forEach(doc=>{

    const d = doc.data();
    const s = d.solicitadoEm.toDate();

    lista.innerHTML += `
    <tr class="pendente">

      <td>${d.doca || ""}</td>
      <td>${d.solicitante || ""}</td>
      <td>${d.posicao}</td>
      <td>${d.partnumber}</td>
      <td>${d.quantidade || ""}</td>
      <td>${d.usoCarro || ""}</td>

      <td>
        ${s.toLocaleString()}
      </td>

      <td data-solicitado="${s.toISOString()}"></td>

      <td>-</td>

      <td>
        <button onclick="confirmar('${doc.id}')">Abastecido</button>
      </td>

    </tr>
    `;

  });

  atualizarGrafico();

});

// ===============================
// CONFIRMAR ABASTECIMENTO
// ===============================
function confirmar(id){

  db.collection("solicitacoes")
  .doc(id)
  .update({
    status:"FINALIZADO",
    abastecidoEm:new Date()
  });

}

// ===============================
// CRONÔMETRO ATRASO
// ===============================
setInterval(()=>{

  document.querySelectorAll("[data-solicitado]").forEach(el=>{

    const inicio = new Date(el.dataset.solicitado);

    const diff = new Date() - inicio;

    const minutos = Math.floor(diff/60000);
    const horas = Math.floor(minutos/60);
    const mins = minutos % 60;

    el.innerText = `${horas}h ${mins}m`;

  });

},1000);

// ===============================
// FILTRAR POR DATA
// ===============================
function filtrarPorData(){

  const data = document.getElementById("filtroData").value;

  if(!data){
    alert("Selecione uma data");
    return;
  }

  const inicio = new Date(data+"T00:00:00");
  const fim = new Date(data+"T23:59:59");

  historico.innerHTML="";

  db.collection("solicitacoes")
  .where("status","==","FINALIZADO")
  .get()
  .then(snapshot=>{

    snapshot.forEach(doc=>{

      const d = doc.data();

      if(!d.abastecidoEm) return;

      const abastecido = d.abastecidoEm.toDate();

      if(abastecido >= inicio && abastecido <= fim){

        historico.innerHTML += `
        <tr>

          <td>${d.doca || ""}</td>
          <td>${d.solicitante || ""}</td>
          <td>${d.posicao}</td>
          <td>${d.partnumber}</td>
          <td>${d.quantidade || ""}</td>
          <td>${d.usoCarro || ""}</td>

          <td>
          ${d.solicitadoEm.toDate().toLocaleString()}
          </td>

          <td>
          ${abastecido.toLocaleString()}
          </td>

          <td>-</td>

        </tr>
        `;

      }

    });

  });

}

// ===============================
// EXPORTAR PARA EXCEL
// ===============================
function exportarExcel(){

  const tabela = document.querySelector("#historico").closest("table");

  let html = tabela.outerHTML;

  const url = 'data:application/vnd.ms-excel;charset=utf-8,' + encodeURIComponent(html);

  const link = document.createElement("a");

  link.href = url;
  link.download = "historico_abastecimento.xls";

  document.body.appendChild(link);

  link.click();

  document.body.removeChild(link);

}

// ===============================
// GRÁFICO
// ===============================
let grafico;

function atualizarGrafico(){

  db.collection("solicitacoes")
  .where("status","==","FINALIZADO")
  .get()
  .then(snapshot=>{

    const dados={};

    snapshot.forEach(doc=>{

      if(!doc.data().abastecidoEm) return;

      const dia = doc.data()
      .abastecidoEm
      .toDate()
      .toLocaleDateString("pt-BR");

      dados[dia] = (dados[dia] || 0) + 1;

    });

    const labels = Object.keys(dados);
    const valores = Object.values(dados);

    if(grafico) grafico.destroy();

    const ctx = document.getElementById("graficoDiario");

    grafico = new Chart(ctx,{
      type:"bar",
      data:{
        labels:labels,
        datasets:[{
          label:"Abastecimentos por dia",
          data:valores,
          borderRadius:6,
          backgroundColor:"#2563eb"
        }]
      },
      options:{
        responsive:true,
        plugins:{
          legend:{display:false}
        },
        scales:{
          y:{
            beginAtZero:true
          }
        }
      }
    });

  });

}
