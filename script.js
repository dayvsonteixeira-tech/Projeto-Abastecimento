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

let grafico=null

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

docaEl.value=""
solicitanteEl.value=""
posicaoEl.value=""
partnumberEl.value=""
quantidadeEl.value=""
usoCarroEl.value=""

}


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

<td>${d.doca}</td>
<td>${d.solicitante}</td>
<td>${d.posicao}</td>
<td>${d.partnumber}</td>
<td>${d.quantidade}</td>
<td>${d.usoCarro}</td>
<td>${s.toLocaleString()}</td>
<td data-solicitado="${s.toISOString()}"></td>
<td><input id="c-${doc.id}" placeholder="Comentário"></td>
<td><button onclick="confirmar('${doc.id}')">Abastecido</button></td>

</tr>

`

})

document.getElementById("kpiPendentes").innerText=total

atualizarGrafico()

})



function confirmar(id){

const comentario=document.getElementById(`c-${id}`).value||""

db.collection("solicitacoes").doc(id).update({

status:"FINALIZADO",
comentario,
abastecidoEm:new Date()

})

}



function formatarTempo(ms){

const totalMin=Math.floor(ms/60000)

const horas=Math.floor(totalMin/60)

const minutos=totalMin%60

return horas+"h "+minutos+"m"

}


setInterval(()=>{

document.querySelectorAll("[data-solicitado]").forEach(el=>{

const ini=new Date(el.dataset.solicitado)

el.innerText=formatarTempo(new Date()-ini)

})

},1000)



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

</tr>

`

}

})

})

}



function exportarExcel(){

let tabela=document.querySelector("#historico").parentElement

let html=tabela.outerHTML

let url='data:application/vnd.ms-excel,'+encodeURIComponent(html)

let link=document.createElement("a")

link.href=url
link.download="historico.xls"

link.click()

}



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

plugins:{

legend:{display:false}

},

scales:{

y:{

beginAtZero:true,

ticks:{stepSize:1}

}

}

}

})

})

}
