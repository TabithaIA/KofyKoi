// chats.js - Manejo del Chat Privado en Tiempo Real

const miNombre = localStorage.getItem('kofy_nombre') || "@KofyUser";
const miAvatar = localStorage.getItem('kofy_avatar') || "https://i.pravatar.cc/150?u=kofy";

const chatRoomId = localStorage.getItem('chat_actual_id');
const usuarioDestino = localStorage.getItem('chat_actual_destino');

document.addEventListener('DOMContentLoaded', () => {
    // 1. Cargar info del usuario en el Header común
    document.getElementById('nav-username').textContent = miNombre;
    document.getElementById('imgNav').src = miAvatar;

    // 2. Verificar si tenemos una sala de chat activa seleccionada
    if (chatRoomId && usuarioDestino) {
        document.getElementById('chat-with-title').textContent = `Charlando con ${usuarioDestino} 🌸`;
        
        // Habilitamos los inputs
        document.getElementById('msgInput').disabled = false;
        document.getElementById('btnEnviarMsg').disabled = false;

        // Escuchar los mensajes de esta sala en Firebase
        cargarMensajes(chatRoomId);
    }
    
    // Escuchar la tecla "Enter" para enviar rápido
    document.getElementById('msgInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') enviarMensajePrivado();
    });
});

function cargarMensajes(roomId) {
    const container = document.getElementById('messages-container');
    
    // Escuchamos la rama específica de esta sala de chat
    database.ref(`mensajes_privados/${roomId}`).on('value', (snapshot) => {
        container.innerHTML = ""; // Limpiamos la caja para redibujar
        
        if (!snapshot.exists()) {
            container.innerHTML = `<p style="text-align:center; color:gray; font-size:0.8rem; margin-top:20px;">Aquí comenzará tu conversación zen... ✨</p>`;
            return;
        }

        snapshot.forEach((child) => {
            const datos = child.val();
            const msgDiv = document.createElement('div');
            
            // Si el mensaje lo envié yo, clase 'me', sino clase 'other'
            if (datos.remitente === miNombre) {
                msgDiv.className = "msg me";
            } else {
                msgDiv.className = "msg other";
            }

            msgDiv.textContent = datos.texto;
            container.appendChild(msgDiv);
        });

        // Auto-scroll al último mensaje recibido
        container.scrollTop = container.scrollHeight;
    });
}

function enviarMensajePrivado() {
    const input = document.getElementById('msgInput');
    const texto = input.value.trim();
    
    if (!texto || !chatRoomId) return;

    // Subimos el mensaje a la sala única en Firebase
    database.ref(`mensajes_privados/${chatRoomId}`).push({
        remitente: miNombre,
        texto: texto,
        fecha: Date.now()
    }).then(() => {
        input.value = ""; // Limpiamos el input al enviar
    }).catch(err => console.error("Error al enviar mensaje privado:", err));
}
