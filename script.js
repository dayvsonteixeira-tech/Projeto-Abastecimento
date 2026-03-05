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

  const posicao = posicaoEl.value.trim();
  const partnumber = partnumberEl.value.trim();

  if(!posicao || !partnumber){
    alert("Preencha todos os campos");
    return;
  }

  db.collection("solicitacoes").add({
    posicao,
    partnumber,
    solicitadoEm:new Date(),
    status:"PENDENTE"
  });

  posicaoEl.value="";
  partnumberEl.value="";
}

// ===============================
// LISTAR SOLICITAÇÕES
// ===============================
db.collection("solicitacoes")
.orderBy("solicitadoEm","desc")
.onSnapshot(snapshot=>{

  lista.innerHTML="";

  snapshot.forEach(doc=>{

    const d = doc.data();
    const s = d.solicitadoEm.toDate();

    lista.innerHTML += `
    <tr class="${d.status === "PENDENTE" ? "pendente" : "finalizado"}">

      <td data-label="Posição">${d.posicao}</td>

      <td data-label="Partnumber">${d.partnumber}</td>

      <td data-label="Solicitado em">
        ${s.toLocaleString()}
      </td>

      <td data-label="Atraso" data-solicitado="${s.toISOString()}"></td>

      <td data-label="Status">
        ${d.status}
      </td>

      <td data-label="Ação">
        ${
          d.status==="PENDENTE"
          ? `<button onclick="confirmar('${doc.id}')">Abastecido</button>`
          : "-"
        }
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
// FILTRAR HISTÓRICO
// ===============================
function filtrarHistorico(){

  const data = document.getElementById("filtroData").value;

  if(!data){
    alert("Selecione uma data");
    return;
  }

  const inicio = new Date(data+"T00:00");
  const fim = new Date(data+"T23:59");

  historico.innerHTML="";

  db.collection("solicitacoes")
  .where("status","==","FINALIZADO")
  .get()
  .then(snapshot=>{

    snapshot.forEach(doc=>{

      const d = doc.data();

      const abastecido = d.abastecidoEm.toDate();

      if(abastecido >= inicio && abastecido <= fim){

        historico.innerHTML += `
        <tr class="finalizado">

          <td data-label="Posição">${d.posicao}</td>

          <td data-label="Partnumber">${d.partnumber}</td>

          <td data-label="Solicitado em">
          ${d.solicitadoEm.toDate().toLocaleString()}
          </td>

          <td data-label="Abastecido em">
          ${abastecido.toLocaleString()}
          </td>

          <td data-label="Status">
          ${d.status}
          </td>

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

  let tabela = document.getElementById("historico").parentNode.querySelector("table");

  let html = tabela.outerHTML;

  let url = 'data:application/vnd.ms-excel,' + encodeURIComponent(html);

  let link = document.createElement("a");

  link.href = url;

  link.download = "historico_abastecimento.xls";

  link.click();

}

// ===============================
// GRÁFICO PROFISSIONAL
// ===============================
let grafico;

function atualizarGrafico(){

  db.collection("solicitacoes")
  .where("status","==","FINALIZADO")
  .get()
  .then(snapshot=>{

    const dados={};

    snapshot.forEach(doc=>{

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
