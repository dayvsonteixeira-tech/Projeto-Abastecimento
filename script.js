import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, where, orderBy, doc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Configuração Profissional
const firebaseConfig = {
    apiKey: "AIzaSyD...", // Substitua pela sua
    authDomain: "controle-abastecimento-f80ed.firebaseapp.com",
    projectId: "controle-abastecimento-f80ed"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- FUNÇÕES DE INTERFACE ---

const tocarAlerta = () => {
    const audio = document.getElementById("alertaSom");
    audio.play().catch(e => console.log("Interação necessária para som"));
};

const formatarTempo = (timestamp) => {
    if (!timestamp) return "...";
    const inicio = timestamp.toDate();
    const diff = Math.floor((new Date() - inicio) / 60000);
    return diff > 60 ? `${Math.floor(diff/60)}h ${diff%60}m` : `${diff} min`;
};

// --- OPERAÇÕES DE DADOS ---

const realizarPedido = async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.disabled = true; // Previne cliques duplos

    const dados = {
        doca: document.getElementById("doca").value,
        solicitante: document.getElementById("solicitante").value,
        posicao: document.getElementById("posicao").value.trim().toUpperCase(),
        partnumber: document.getElementById("partnumber").value.trim(),
        quantidade: Number(document.getElementById("quantidade").value),
        usoCarro: document.getElementById("usoCarro").value.trim(),
        status: "PENDENTE",
        criadoEm: serverTimestamp()
    };

    try {
        await addDoc(collection(db, "solicitacoes"), dados);
        e.target.reset();
    } catch (err) {
        alert("Erro ao enviar: " + err.message);
    } finally {
        btn.disabled = false;
    }
};

// --- ESCUTA EM TEMPO REAL ---

const sub = query(collection(db, "solicitacoes"), orderBy("criadoEm", "desc"));

onSnapshot(sub, (snapshot) => {
    const lista = document.getElementById("listaPendentes");
    lista.innerHTML = "";
    let pendentesCount = 0;

    snapshot.forEach((docSnap) => {
        const item = docSnap.data();
        if (item.status === "PENDENTE") {
            pendentesCount++;
            
            const tr = document.createElement("tr");
            tr.className = "row-animate";
            tr.innerHTML = `
                <td><strong>Doca ${item.doca}</strong></td>
                <td>${item.solicitante}</td>
                <td>${item.partnumber}<br><small>${item.posicao}</small></td>
                <td>${item.quantidade}</td>
                <td><span class="badge">${formatarTempo(item.criadoEm)}</span></td>
                <td>
                    <button class="btn-check" onclick="finalizar('${docSnap.id}')">Concluir</button>
                </td>
            `;
            lista.appendChild(tr);
        }
    });

    document.getElementById("kpiPendentes").innerText = pendentesCount;
});

// Tornar função global para o onclick do HTML (contexto de module)
window.finalizar = async (id) => {
    const docRef = doc(db, "solicitacoes", id);
    await updateDoc(docRef, { 
        status: "FINALIZADO",
        finalizadoEm: serverTimestamp() 
    });
};

document.getElementById("formAbastecimento").addEventListener("submit", realizarPedido);
