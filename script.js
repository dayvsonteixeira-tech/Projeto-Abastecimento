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
let primeiraCarga=true


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

posicaoEl.value=""
partnumberEl.value=""
quantidadeEl.value=""
usoCarroEl.value=""
}


db.collection("solicitacoes")
.orderBy("solicitadoEm","desc")
.onSnapshot(snapshot=>{

if(!primeiraCarga){
tocarAlerta()
}

primeiraCarga=false

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
<td data-label="Solicitado">${s.toLocaleString()}</td>
<td data-label="Atraso" data-solicitado="${s.toISOString()}"></td>

<td data-label="Comentário">
<input id="c-${doc.id}" placeholder="Comentário">
</td>

<td data-label="Ação">
<button class="abastecido" onclick="confirmar('${doc.id}')">Abastecido</button>
</td>

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


function atualizarAtrasos(){

document.querySelectorAll("[data-solicitado]").forEach(el=>{

const inicio=new Date(el.dataset.solicitado)
const diff=new Date()-inicio

el.innerText=formatarTempo(diff)

})

}

setInterval(atualizarAtrasos,1000)


function tocarAlerta(){

const audio=document.getElementById("alertaSom")
audio.play().catch(()=>{})

}


function filtrarPorData(){

const data=document.getElementById("filtroData").value

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

<td data-label="Doca">${d.doca}</td>
<td data-label="Solicitante">${d.solicitante}</td>
<td data-label="Posição">${d.posicao}</td>
<td data-label="Partnumber">${d.partnumber}</td>
<td data-label="Qtd">${d.quantidade}</td>
<td data-label="Uso por Carro">${d.usoCarro}</td>
<td data-label="Solicitado">${d.solicitadoEm.toDate().toLocaleString()}</td>
<td data-label="Abastecido">${ab.toLocaleString()}</td>
<td data-label="Comentário">${d.comentario||"-"}</td>

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
