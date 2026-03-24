/* ===========================
   FIREBASE INIT
=========================== */
firebase.initializeApp({
  apiKey: "AIzaSyDgpRxB7gluCbqEnFHIf68xDQVRmAp0dBo",
  authDomain: "controle-abastecimento-f80ed.firebaseapp.com",
  projectId: "controle-abastecimento-f80ed"
})

const db = firebase.firestore()

/* ===========================
   ELEMENTOS
=========================== */
const docaEl        = document.getElementById("doca")
const solicitanteEl = document.getElementById("solicitante")
const posicaoEl     = document.getElementById("posicao")
const partnumberEl  = document.getElementById("partnumber")
const quantidadeEl  = document.getElementById("quantidade")
const usoCarroEl    = document.getElementById("usoCarro")
const lista         = document.getElementById("lista")
const historico     = document.getElementById("historico")

let grafico       = null
let primeiraCarga = true
let totalPendentes = 0

/* ===========================
   PLUGIN: VALORES NO TOPO DAS BARRAS
=========================== */
Chart.register({
  id: 'valoresTopo',
  afterDatasetsDraw(chart) {
    const { ctx } = chart
    chart.data.datasets.forEach((dataset, i) => {
      const meta = chart.getDatasetMeta(i)
      meta.data.forEach((bar, index) => {
        const valor = dataset.data[index]
        ctx.fillStyle = "#8892a4"
        ctx.font = "bold 11px 'DM Sans', sans-serif"
        ctx.textAlign = "center"
        ctx.fillText(valor, bar.x, bar.y - 6)
      })
    })
  }
})

/* ===========================
   SOLICITAR MATERIAL
=========================== */
function solicitarMaterial() {
  const doca        = docaEl.value
  const solicitante = solicitanteEl.value
  const posicao     = posicaoEl.value.trim()
  const partnumber  = partnumberEl.value.trim()
  const quantidade  = Number(quantidadeEl.value)
  const usoCarro    = usoCarroEl.value.trim()

  if (!doca || !solicitante || !posicao || !partnumber || !quantidade || !usoCarro) {
    mostrarToast("Preencha todos os campos", "error")
    return
  }

  db.collection("solicitacoes").add({
    doca, solicitante, posicao, partnumber, quantidade, usoCarro,
    solicitadoEm: new Date(),
    status: "PENDENTE"
  }).then(() => {
    mostrarToast("Solicitação enviada com sucesso!", "success")
    posicaoEl.value    = ""
    partnumberEl.value = ""
    quantidadeEl.value = ""
    usoCarroEl.value   = ""
  }).catch(() => mostrarToast("Erro ao enviar solicitação", "error"))
}

/* ===========================
   LISTENER PRINCIPAL
=========================== */
db.collection("solicitacoes")
  .orderBy("solicitadoEm", "asc")
  .onSnapshot(snapshot => {

    if (!primeiraCarga) {
      tocarAlerta()
      mostrarAlertaVisual()
    }
    primeiraCarga = false

    lista.innerHTML = ""
    let total = 0
    let dadosGrafico = {}

    snapshot.forEach(doc => {
      const d = doc.data()

      /* PENDENTES */
      if (d.status === "PENDENTE") {
        total++
        const s = d.solicitadoEm.toDate()
        lista.innerHTML += `
          <tr class="pendente">
            <td data-label="Doca"><strong>${d.doca}</strong></td>
            <td data-label="Solicitante">${d.solicitante}</td>
            <td data-label="Posição">${d.posicao}</td>
            <td data-label="Partnumber">${d.partnumber}</td>
            <td data-label="Qtd">${d.quantidade}</td>
            <td data-label="Uso/Carro">${d.usoCarro}</td>
            <td data-label="Solicitado">${s.toLocaleString()}</td>
            <td data-label="Tempo" data-solicitado="${s.toISOString()}"></td>
            <td data-label="Comentário">
              <input class="comment-input" id="c-${doc.id}" placeholder="Adicionar comentário...">
            </td>
            <td data-label="Ação">
              <button class="btn-finalizar" onclick="confirmar('${doc.id}')">✓ Finalizar</button>
            </td>
          </tr>
        `
      }

      /* GRÁFICO */
      if (d.status === "FINALIZADO") {
        const data = d.abastecidoEm?.toDate()
        if (data) {
          const dia = data.toLocaleDateString()
          dadosGrafico[dia] = (dadosGrafico[dia] || 0) + 1
        }
      }
    })

    totalPendentes = total

    // KPI
    document.getElementById("kpiPendentes").innerText = total
    document.getElementById("badgePendentes").innerText = total

    // Barra KPI (max visual = 20)
    const pct = Math.min((total / 20) * 100, 100)
    document.getElementById("kpiBarFill").style.width = pct + "%"

    // Empty state
    const emptyPendentes = document.getElementById("emptyPendentes")
    if (total === 0) {
      emptyPendentes.classList.add("show")
    } else {
      emptyPendentes.classList.remove("show")
    }

    atualizarGrafico(dadosGrafico)
    atualizarAtrasos()
  })

/* ===========================
   CONFIRMAR FINALIZAÇÃO
=========================== */
function confirmar(id) {
  const comentario = document.getElementById(`c-${id}`)?.value || ""
  db.collection("solicitacoes").doc(id).update({
    status: "FINALIZADO",
    comentario,
    abastecidoEm: new Date()
  }).then(() => mostrarToast("Abastecimento finalizado!", "success"))
}

/* ===========================
   FORMATAÇÃO DE TEMPO
=========================== */
function formatarTempo(ms) {
  const totalMin = Math.floor(ms / 60000)
  const horas    = Math.floor(totalMin / 60)
  const minutos  = totalMin % 60
  return horas + "h " + String(minutos).padStart(2, "0") + "m"
}

function atualizarAtrasos() {
  document.querySelectorAll("[data-solicitado]").forEach(el => {
    const inicio = new Date(el.dataset.solicitado)
    const diff   = new Date() - inicio
    el.innerText = formatarTempo(diff)
  })
}
setInterval(atualizarAtrasos, 60000)

/* ===========================
   ALERTAS
=========================== */
function tocarAlerta() {
  const audio = document.getElementById("alertaSom")
  audio.play().catch(() => {})
}

function mostrarAlertaVisual() {
  const alerta = document.getElementById("alertaVisual")
  alerta.classList.add("show")
  setTimeout(() => alerta.classList.remove("show"), 5000)
}

/* ===========================
   TOAST NOTIFICATION
=========================== */
function mostrarToast(msg, tipo = "success") {
  const existing = document.querySelector(".toast")
  if (existing) existing.remove()

  const toast = document.createElement("div")
  toast.className = "toast toast-" + tipo
  toast.textContent = msg

  Object.assign(toast.style, {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    background: tipo === "success" ? "#0d2b27" : "#2b0d10",
    color: tipo === "success" ? "#2dd4bf" : "#ff6b6b",
    border: `1px solid ${tipo === "success" ? "rgba(45,212,191,0.3)" : "rgba(255,107,107,0.3)"}`,
    padding: "12px 20px",
    borderRadius: "10px",
    fontFamily: "'DM Sans', sans-serif",
    fontSize: "13px",
    fontWeight: "600",
    zIndex: "9999",
    boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
    animation: "fadeIn 0.3s ease",
    cursor: "pointer"
  })

  toast.onclick = () => toast.remove()
  document.body.appendChild(toast)
  setTimeout(() => toast.remove(), 3500)
}

/* ===========================
   HISTÓRICO
=========================== */
function filtrarPorData() {
  const data = document.getElementById("filtroData").value
  if (!data) {
    mostrarToast("Selecione uma data", "error")
    return
  }

  const inicio = new Date(data + "T00:00:00")
  const fim    = new Date(data + "T23:59:59")
  historico.innerHTML = ""

  const emptyHistorico = document.getElementById("emptyHistorico")
  emptyHistorico.classList.remove("show")

  db.collection("solicitacoes")
    .where("status", "==", "FINALIZADO")
    .get()
    .then(snapshot => {
      let count = 0

      snapshot.forEach(doc => {
        const d = doc.data()
        if (!d.abastecidoEm) return

        const ab = d.abastecidoEm.toDate()
        if (ab >= inicio && ab <= fim) {
          count++
          historico.innerHTML += `
            <tr>
              <td data-label="Doca">${d.doca}</td>
              <td data-label="Solicitante">${d.solicitante}</td>
              <td data-label="Posição">${d.posicao}</td>
              <td data-label="Partnumber">${d.partnumber}</td>
              <td data-label="Qtd">${d.quantidade}</td>
              <td data-label="Uso/Carro">${d.usoCarro}</td>
              <td data-label="Solicitado">${d.solicitadoEm.toDate().toLocaleString()}</td>
              <td data-label="Abastecido">${ab.toLocaleString()}</td>
              <td data-label="Comentário">${d.comentario || "—"}</td>
            </tr>
          `
        }
      })

      if (count === 0) emptyHistorico.classList.add("show")
    })
}

function exportarExcel() {
  const tabela = document.getElementById("tabelaHistorico")
  const html   = tabela.outerHTML
  const url    = 'data:application/vnd.ms-excel,' + encodeURIComponent(html)
  const link   = document.createElement("a")
  link.href     = url
  link.download = "historico.xls"
  link.click()
}

/* ===========================
   GRÁFICO
=========================== */
function atualizarGrafico(dados) {
  const ctx = document.getElementById("graficoDiario").getContext("2d")
  if (grafico) grafico.destroy()

  const labels = Object.keys(dados)
  const values = Object.values(dados)

  grafico = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Abastecimentos",
        data: values,
        backgroundColor: "rgba(45,212,191,0.25)",
        borderColor: "#2dd4bf",
        borderWidth: 2,
        borderRadius: 6,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#1a1e29",
          borderColor: "#252a38",
          borderWidth: 1,
          titleColor: "#f0f2f7",
          bodyColor: "#8892a4",
          padding: 12,
          titleFont: { family: "'Space Mono', monospace", size: 11 },
          bodyFont:  { family: "'DM Sans', sans-serif", size: 13 }
        }
      },
      scales: {
        x: {
          grid: { color: "rgba(255,255,255,0.04)" },
          ticks: {
            color: "#4e5668",
            font: { family: "'DM Sans', sans-serif", size: 11 }
          }
        },
        y: {
          beginAtZero: true,
          grid: { color: "rgba(255,255,255,0.04)" },
          ticks: {
            color: "#4e5668",
            stepSize: 1,
            precision: 0,
            font: { family: "'Space Mono', monospace", size: 11 }
          }
        }
      }
    }
  })
}
