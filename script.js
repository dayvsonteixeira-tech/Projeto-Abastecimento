const firebaseConfig = {

apiKey: "SUA_API_KEY",
authDomain: "SEU_DOMINIO",
databaseURL: "SEU_DATABASE",
projectId: "SEU_PROJETO",
storageBucket: "",
messagingSenderId: "",
appId: ""

};

firebase.initializeApp(firebaseConfig);

const db = firebase.database();


function carregarSolicitacoes(){

db.ref("solicitacoes").on("value", snapshot => {

const pendentes = document.getElementById("listaPendentes");
const andamento = document.getElementById("listaAndamento");

pendentes.innerHTML="";
andamento.innerHTML="";

snapshot.forEach(child => {

const id = child.key;
const item = child.val();

if(item.status === "pendente"){

pendentes.innerHTML += `
<tr>

<td>${item.doca}</td>
<td>${item.solicitante}</td>
<td>${item.posicao}</td>
<td>${item.partnumber}</td>
<td>${item.qtd}</td>
<td>${item.comentarios || ""}</td>

<td>
<button onclick="iniciar('${id}')">Iniciar</button>
</td>

</tr>
`;

}

if(item.status === "andamento"){

andamento.innerHTML += `
<tr>

<td>${item.doca}</td>
<td>${item.solicitante}</td>
<td>${item.posicao}</td>
<td>${item.partnumber}</td>
<td>${item.qtd}</td>
<td>${item.comentarios || ""}</td>

<td>
<button onclick="finalizar('${id}')">Finalizar</button>
</td>

</tr>
`;

}

});

});

}


function iniciar(id){

db.ref("solicitacoes/"+id).update({

status:"andamento"

});

}


function finalizar(id){

db.ref("solicitacoes/"+id).once("value", snap => {

const dados = snap.val();

const historico = {

...dados,

dataFinalizacao: new Date().toISOString()

};

db.ref("historico").push(historico);

db.ref("solicitacoes/"+id).remove();

});

}


function filtrarHistorico(){

const dataInicial = document.getElementById("dataInicial").value;
const dataFinal = document.getElementById("dataFinal").value;

const tbody = document.getElementById("listaHistorico");

tbody.innerHTML="";

const inicio = dataInicial ? new Date(dataInicial) : null;
const fim = dataFinal ? new Date(dataFinal+"T23:59:59") : null;

db.ref("historico").once("value", snapshot => {

snapshot.forEach(child => {

const item = child.val();

const dataItem = new Date(item.dataFinalizacao);

if(
(!inicio || dataItem >= inicio) &&
(!fim || dataItem <= fim)
){

tbody.innerHTML += `

<tr>

<td>${item.doca}</td>
<td>${item.solicitante}</td>
<td>${item.posicao}</td>
<td>${item.partnumber}</td>
<td>${item.qtd}</td>
<td>${item.abastecido || ""}</td>
<td>${item.comentarios || ""}</td>

</tr>

`;

}

});

});

}


carregarSolicitacoes();
