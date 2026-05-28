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
const perfilEl      = document.getElementById("perfilUsuario")
const notifStatusEl = document.getElementById("notifStatus")

let grafico        = null
let primeiraCarga  = true
let totalPendentes = 0
let idsConhecidos  = new Set()

/* ===========================
   CONTROLE DE MÊS DO GRÁFICO
   — zera automaticamente ao virar o mês
=========================== */
const GRAFICO_MES_KEY = "ca_grafico_mes"

function mesAtualStr() {
  const agora = new Date()
  return `${agora.getFullYear()}-${agora.getMonth()}`
}

function verificarResetMes() {
  const mesSalvo  = localStorage.getItem(GRAFICO_MES_KEY)
  const mesAtual  = mesAtualStr()
  if (mesSalvo !== mesAtual) {
    localStorage.setItem(GRAFICO_MES_KEY, mesAtual)
  }
}

/* ===========================
   PERFIL — persiste no localStorage
=========================== */
const PERFIL_KEY = "ca_perfil_usuario"

function salvarPerfil() {
  localStorage.setItem(PERFIL_KEY, perfilEl.value)
  atualizarIconeNotif()
}

function carregarPerfil() {
  const salvo = localStorage.getItem(PERFIL_KEY)
  if (salvo) perfilEl.value = salvo
}

perfilEl.addEventListener("change", salvarPerfil)

/* ===========================
   NOTIFICAÇÕES
=========================== */
function atualizarIconeNotif() {
  if (!("Notification" in window)) {
    notifStatusEl.textContent = "🔕"
    notifStatusEl.title = "Notificações não suportadas neste navegador"
    return
  }
  if (Notification.permission === "granted") {
    notifStatusEl.textContent = "🔔"
    notifStatusEl.title = "Notificações ativas"
    notifStatusEl.style.opacity = "1"
  } else if (Notification.permission === "denied") {
    notifStatusEl.textContent = "🔕"
    notifStatusEl.title = "Notificações bloqueadas — libere nas configurações do navegador"
    notifStatusEl.style.opacity = "0.5"
  } else {
    notifStatusEl.textContent = "🔔"
    notifStatusEl.title = "Clique para ativar notificações"
    notifStatusEl.style.opacity = "0.4"
  }
}

async function pedirPermissao() {
  if (!("Notification" in window)) return
  if (Notification.permission === "default") {
    const resultado = await Notification.requestPermission()
    if (resultado === "granted") {
      mostrarToast("Notificações ativadas! ✓", "success")
    }
    atualizarIconeNotif()
  }
}

notifStatusEl.addEventListener("click", pedirPermissao)

function enviarNotificacao(titulo, corpo, opcoes = {}) {
  if (!("Notification" in window)) return
  if (Notification.permission !== "granted") return
  new Notification(titulo, {
    body: corpo,
    icon: "https://cdn-icons-png.flaticon.com/512/1170/1170611.png",
    badge: "https://cdn-icons-png.flaticon.com/512/1170/1170611.png",
    tag: opcoes.tag || "ca-notif",
    renotify: true,
    ...opcoes
  })
}

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
        ctx.fillStyle = "#94a3b8"
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
   FIXAR COMENTÁRIO
=========================== */
function fixarComentario(id) {
  const comentarioEl = document.getElementById(`c-${id}`)
  const motivoEl     = document.getElementById(`m-${id}`)
  const comentario   = comentarioEl ? comentarioEl.value : ""
  const motivo       = motivoEl ? motivoEl.value : ""

  db.collection("solicitacoes").doc(id).update({
    comentario,
    motivoAtraso: motivo
  }).then(() => {
    mostrarToast("Comentário fixado!", "success")
    // Marca visualmente que foi fixado
    const btn = document.getElementById(`btn-fixar-${id}`)
    if (btn) {
      btn.textContent = "✓ Fixado"
      btn.style.opacity = "0.6"
      btn.style.cursor = "default"
      btn.disabled = true
    }
  }).catch(() => mostrarToast("Erro ao fixar comentário", "error"))
}

/* ===========================
   LISTENER PRINCIPAL
=========================== */
db.collection("solicitacoes")
  .orderBy("solicitadoEm", "asc")
  .onSnapshot(snapshot => {

    const perfil = perfilEl.value

    snapshot.docChanges().forEach(change => {
      const d  = change.doc.data()
      const id = change.doc.id

      if (change.type === "added" && !primeiraCarga && d.status === "PENDENTE") {
        if (perfil === "abastecedor") {
          enviarNotificacao(
            "⚡ Novo pedido de abastecimento",
            `${d.solicitante} solicitou ${d.quantidade}x ${d.partnumber} — Doca ${d.doca}`,
            { tag: "novo-" + id }
          )
        }
      }

      if (change.type === "modified" && !primeiraCarga && d.status === "FINALIZADO") {
        if (perfil && perfil !== "abastecedor" && d.solicitante === perfil) {
          enviarNotificacao(
            "✅ Seu pedido foi abastecido!",
            `${d.partnumber} — Posição ${d.posicao} (Doca ${d.doca})${d.comentario ? "\n💬 " + d.comentario : ""}`,
            { tag: "ok-" + id }
          )
        }
      }
    })

    lista.innerHTML = ""
    let total = 0
    let dadosGrafico = {}

    verificarResetMes()

    const agora     = new Date()
    const mesAtual  = agora.getMonth()
    const anoAtual  = agora.getFullYear()

    snapshot.forEach(doc => {
      const d = doc.data()

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
              <input class="comment-input" id="c-${doc.id}" placeholder="Adicionar comentário..." value="${d.comentario || ''}">
            </td>
            <td data-label="Motivo do Atraso">
              <input class="comment-input motivo-input" id="m-${doc.id}" placeholder="Motivo do atraso..." value="${d.motivoAtraso || ''}">
            </td>
            <td data-label="Ação">
              <button class="btn-fixar" id="btn-fixar-${doc.id}" onclick="fixarComentario('${doc.id}')">📌 Fixar Comentário</button>
              <button class="btn-finalizar" onclick="confirmar('${doc.id}')">✓ Finalizar</button>
            </td>
          </tr>
        `
      }

      if (d.status === "FINALIZADO") {
        const data = d.abastecidoEm?.toDate()
        if (data) {
          if (
            data.getMonth()    === mesAtual &&
            data.getFullYear() === anoAtual
          ) {
            const dia = data.toLocaleDateString()
            dadosGrafico[dia] = (dadosGrafico[dia] || 0) + 1
          }
        }
      }
    })

    if (!primeiraCarga) {
      tocarAlerta()
      mostrarAlertaVisual()
    }
    primeiraCarga = false
    totalPendentes = total

    document.getElementById("kpiPendentes").innerText = total
    document.getElementById("badgePendentes").innerText = total

    const pct = Math.min((total / 20) * 100, 100)
    document.getElementById("kpiBarFill").style.width = pct + "%"

    const emptyPendentes = document.getElementById("emptyPendentes")
    total === 0 ? emptyPendentes.classList.add("show") : emptyPendentes.classList.remove("show")

    atualizarGrafico(dadosGrafico)
    atualizarAtrasos()
  })

/* ===========================
   CONFIRMAR FINALIZAÇÃO
=========================== */
function confirmar(id) {
  const comentario = document.getElementById(`c-${id}`)?.value || ""
  const motivo     = document.getElementById(`m-${id}`)?.value || ""
  db.collection("solicitacoes").doc(id).update({
    status: "FINALIZADO",
    comentario,
    motivoAtraso: motivo,
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
    el.innerText = formatarTempo(new Date() - inicio)
  })
}
setInterval(atualizarAtrasos, 60000)

/* ===========================
   ALERTAS VISUAIS / SOM
=========================== */
function tocarAlerta() {
  document.getElementById("alertaSom").play().catch(() => {})
}

function mostrarAlertaVisual() {
  const alerta = document.getElementById("alertaVisual")
  alerta.classList.add("show")
  setTimeout(() => alerta.classList.remove("show"), 5000)
}

/* ===========================
   TOAST
=========================== */
function mostrarToast(msg, tipo = "success") {
  const existing = document.querySelector(".toast")
  if (existing) existing.remove()

  const toast = document.createElement("div")
  toast.className = "toast toast-" + tipo
  toast.textContent = msg

  Object.assign(toast.style, {
    position: "fixed",
    bottom: "80px",
    right: "16px",
    background: tipo === "success" ? "#f0fdf9" : "#fff1f2",
    color: tipo === "success" ? "#0d9488" : "#c1121f",
    border: `1px solid ${tipo === "success" ? "rgba(13,148,136,0.3)" : "rgba(193,18,31,0.25)"}`,
    padding: "12px 20px",
    borderRadius: "10px",
    fontFamily: "'DM Sans', sans-serif",
    fontSize: "13px",
    fontWeight: "600",
    zIndex: "9999",
    boxShadow: "0 8px 24px rgba(15,23,42,0.12)",
    cursor: "pointer",
    maxWidth: "calc(100vw - 32px)"
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
  if (!data) { mostrarToast("Selecione uma data", "error"); return }

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
              <td data-label="Motivo do Atraso">${d.motivoAtraso || "—"}</td>
            </tr>
          `
        }
      })
      if (count === 0) emptyHistorico.classList.add("show")
    })
}

function exportarExcel() {
  const tabela = document.getElementById("tabelaHistorico")
  const url    = 'data:application/vnd.ms-excel,' + encodeURIComponent(tabela.outerHTML)
  const link   = document.createElement("a")
  link.href = url; link.download = "historico.xls"; link.click()
}

/* ===========================
   GRÁFICO
=========================== */
function atualizarGrafico(dados) {
  const ctx = document.getElementById("graficoDiario").getContext("2d")
  if (grafico) grafico.destroy()

  const agora      = new Date()
  const nomeMes    = agora.toLocaleString("pt-BR", { month: "long", year: "numeric" })
  const tituloMes  = nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1)

  grafico = new Chart(ctx, {
    type: "bar",
    data: {
      labels: Object.keys(dados),
      datasets: [{
        label: "Abastecimentos",
        data: Object.values(dados),
        backgroundColor: "rgba(13,148,136,0.12)",
        borderColor: "#0d9488",
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
        title: {
          display: true,
          text: tituloMes,
          color: "#94a3b8",
          font: { family: "'DM Sans', sans-serif", size: 12, weight: "600" },
          padding: { bottom: 16 }
        },
        tooltip: {
          backgroundColor: "#ffffff",
          borderColor: "#e2e6ef",
          borderWidth: 1,
          titleColor: "#0f172a",
          bodyColor: "#475569",
          padding: 12,
          titleFont: { family: "'Space Mono', monospace", size: 11 },
          bodyFont:  { family: "'DM Sans', sans-serif", size: 13 }
        }
      },
      scales: {
        x: {
          grid: { color: "rgba(15,23,42,0.06)" },
          ticks: { color: "#94a3b8", font: { family: "'DM Sans', sans-serif", size: 11 } }
        },
        y: {
          beginAtZero: true,
          grid: { color: "rgba(15,23,42,0.06)" },
          ticks: { color: "#94a3b8", stepSize: 1, precision: 0, font: { family: "'Space Mono', monospace", size: 11 } }
        }
      }
    }
  })
}

/* ===========================
   INIT
=========================== */
carregarPerfil()
atualizarIconeNotif()
verificarResetMes()

if ("Notification" in window && Notification.permission === "default") {
  setTimeout(pedirPermissao, 2000)
}
