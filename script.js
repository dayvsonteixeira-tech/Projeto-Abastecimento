let registros = JSON.parse(localStorage.getItem("abastecimentos")) || [];
const lista = document.getElementById("lista");

function salvar() {
  localStorage.setItem("abastecimentos", JSON.stringify(registros));
}

function formatarHora(data) {
  return data.toLocaleTimeString("pt-BR");
}

function calcularTempo(inicio, fim) {
  const diff = Math.floor((fim - inicio) / 1000);
  const min = Math.floor(diff / 60);
  const seg = diff % 60;
  return `${min}m ${seg}s`;
}

function mostrar() {
  lista.innerHTML = "";

  registros.forEach((r, i) => {
    const li = document.createElement("li");

    if (!r.abastecido) li.classList.add("atraso");
    if (r.abastecido) li.classList.add("concluido");

    let tempo = r.abastecido
      ? calcularTempo(new Date(r.solicitadoEm), new Date(r.abastecidoEm))
      : calcularTempo(new Date(r.solicitadoEm), new Date());

    li.innerHTML = `
      <strong>Posição:</strong> ${r.posicao}<br>
      <strong>Partnumber:</strong> ${r.partnumber}<br>
      <strong>Solicitado:</strong> ${formatarHora(new Date(r.solicitadoEm))}<br>
      ${r.abastecido ? `<strong>Abastecido:</strong> ${formatarHora(new Date(r.abastecidoEm))}<br>` : ""}
      <strong>Tempo:</strong> ⏱️ ${tempo}<br>
      ${!r.abastecido ? `<button onclick="confirmar(${i})">✅ Confirmar Abastecimento</button>` : ""}
    `;

    lista.appendChild(li);
  });
}

function confirmar(index) {
  registros[index].abastecido = true;
  registros[index].abastecidoEm = new Date().toISOString();
  salvar();
  mostrar();
}

document.getElementById("form").addEventListener("submit", e => {
  e.preventDefault();

  registros.push({
    posicao: posicao.value,
    partnumber: partnumber.value,
    solicitadoEm: new Date().toISOString(),
    abastecido: false,
    abastecidoEm: null
  });

  salvar();
  mostrar();
  e.target.reset();
});

setInterval(mostrar, 1000);
mostrar();
