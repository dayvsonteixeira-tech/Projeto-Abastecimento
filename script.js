firebase.initializeApp({
apiKey:"AIzaSyDgpRxB7gluCbqEnFHIf68xDQVRmAp0dBo",
authDomain:"controle-abastecimento-f80ed.firebaseapp.com",
projectId:"controle-abastecimento-f80ed"
})

const db=firebase.firestore()

const docaEl=document.getElementById("doca")
const solicitanteEl=document.getElementById("solicitante")
const posicaoEl=document.getElementById("posicao")
const partnumberEl=document.getElementById("partnumber")
const quantidadeEl=document.getElementById("quantidade")
const usoCarroEl=document.getElementById("usoCarro")

const lista=document.getElementById("lista")
const historico=document.getElementById("historico")

let imagens={}
let grafico=null



// ===============================
// CONVERTER IMAGEM
// ===============================
function carregarImagem(event,id){

const file=event.target.files[0]

if(!file)return

const reader=new FileReader()

reader.onload=function(e){

imagens[id]=e.target.result

}

reader.readAsDataURL(file)

}



// ===============================
// SOLICITAR MATERIAL
// ===============================
function solicitarMaterial(){

const doca=docaEl.value
const solicitante=solicitanteEl.value
const posicao=posicaoEl.value.trim()
const partnumber=partnumberEl.value.trim()
const quantidade=Number(quantidadeEl.value)
const usoCarro=usoCarroEl.value.trim()

if(!doca||!solicitante||!posicao||!partnumber||!quantidade||!usoCarro){

alert("Preencha todos os campos")
return

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

})

docaEl.selectedIndex=0
solicitanteEl.selectedIndex=0
posicaoEl.value=""
partnumberEl.value=""
quantidadeEl.value=""
usoCarroEl.value=""

}



// ===============================
// LISTAR SOLICITAÇÕES
// ===============================
db.collection("solicitacoes")
.orderBy("solicitadoEm","desc")
.onSnapshot(snapshot=>{

lista.innerHTML=""

let total=0

snapshot.forEach(doc=>{

const d=doc.data()

if(d.status!=="PENDENTE")return

total++

const s=d.solicitadoEm.toDate()

lista.innerHTML+=`

<tr class="pendente">

<td data-label="Doca">${d.doca}</td>

<td data-label="Solicitante">${d.solicitante}</td>

<td data-label="Posição">${d.posicao}</td>

<td data-label="Partnumber">${d.partnumber}</td>

<td data-label="Qtd">${d.quantidade}</td>

<td data-label="Uso por Carro">${d.usoCarro}</td>

<td data-label="Solicitado">
${s.toLocaleString()}
</td>

<td data-label="Atraso" data-solicitado="${s.toISOString()}"></td>

<td data-label="Comentário">

<div class="comentario-box">

<input id="c-${doc.id}" placeholder="Comentário">

<label class="camera-btn">
<i class="fa-solid fa-camera"></i>
<input type="file" accept="image/*" capture="environment"
onchange="carregarImagem(event,'${doc.id}')">
</label>

</div>

</td>

<td data-label="Ação">
<button onclick="confirmar('${doc.id}')">Abastecido</button>
</td>

</tr>

`

})

document.getElementById("kpiPendentes").innerText=total

atualizarGrafico()

})



// ===============================
// CONFIRMAR
// ===============================
function confirmar(id){

const comentario=document.getElementById(`c-${id}`).value||""

db.collection("solicitacoes").doc(id).update({

status:"FINALIZADO",
comentario,
foto:imagens[id]||null,
abastecidoEm:new Date()

})

}



// ===============================
// FORMATAR TEMPO
// ===============================
function formatarTempo(ms){

const totalMin=Math.floor(ms/60000)

const horas=Math.floor(totalMin/60)

const minutos=totalMin%60

return horas+"h "+minutos+"m"

}



function atualizarAtrasos(){

document.querySelectorAll("[data-solicitado]").forEach(el=>{

const inicio=new Date(el.dataset.solicitado)

const diff=new Date()-inicio

el.innerText=formatarTempo(diff)

})

}

setInterval(atualizarAtrasos,1000)



// ===============================
// HISTÓRICO
// ===============================
function filtrarPorData(){

const data=document.getElementById("filtroData").value

if(!data){

alert("Selecione a data")
return

}

const inicio=new Date(data+"T00:00:00")
const fim=new Date(data+"T23:59:59")

historico.innerHTML=""

db.collection("solicitacoes")
.where("status","==","FINALIZADO")
.get()
.then(snapshot=>{

snapshot.forEach(doc=>{

const d=doc.data()

if(!d.abastecidoEm)return

const ab=d.abastecidoEm.toDate()

if(ab>=inicio && ab<=fim){

historico.innerHTML+=`

<tr>

<td>${d.doca}</td>
<td>${d.solicitante}</td>
<td>${d.posicao}</td>
<td>${d.partnumber}</td>
<td>${d.quantidade}</td>
<td>${d.usoCarro}</td>
<td>${d.solicitadoEm.toDate().toLocaleString()}</td>
<td>${ab.toLocaleString()}</td>
<td>${d.comentario||"-"}</td>

<td>
${d.foto ? `<img src="${d.foto}" width="60">` : "-"}
</td>

</tr>

`

}

})

})

}



// ===============================
// EXPORTAR EXCEL
// ===============================
function exportarExcel(){

let tabela=document.querySelector("#historico").parentElement

let html=tabela.outerHTML

let url='data:application/vnd.ms-excel,'+encodeURIComponent(html)

let link=document.createElement("a")

link.href=url
link.download="historico.xls"

link.click()

}



// ===============================
// GRÁFICO
// ===============================
function atualizarGrafico(){

db.collection("solicitacoes")
.where("status","==","FINALIZADO")
.get()
.then(snapshot=>{

const dados={}

snapshot.forEach(doc=>{

const d=doc.data()

if(!d.abastecidoEm)return

const dia=d.abastecidoEm.toDate().toLocaleDateString("pt-BR")

dados[dia]=(dados[dia]||0)+1

})

const labels=Object.keys(dados)
const valores=Object.values(dados)

const ctx=document.getElementById("graficoDiario").getContext("2d")

if(grafico)grafico.destroy()

grafico=new Chart(ctx,{

type:"bar",

data:{
labels:labels,
datasets:[{
label:"Abastecimentos por dia",
data:valores,
backgroundColor:"#2563eb",
borderRadius:6
}]
},

options:{
responsive:true,
plugins:{legend:{display:false}},
scales:{y:{beginAtZero:true,ticks:{stepSize:1}}}
}

})

})

}
