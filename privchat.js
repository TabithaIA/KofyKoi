// chats.js - Manejo del Chat Privado y Eliminación en Tiempo Real

const miNombre = localStorage.getItem('kofy_nombre') || "@KofyUser";
const miAvatar = localStorage.getItem('kofy_avatar') || "https://i.pravatar.cc/150?u=kofy";

const chatRoomId = localStorage.getItem('chat_actual_id');
const usuarioDestino = localStorage.getItem('chat_actual_destino');

document.addEventListener('DOMContentLoaded', () => {
    // Cargar barra de navegación superior
    document.getElementById('nav-username').textContent = miNombre;
    document.getElementById('imgNav').src = miAvatar;

    // Verificar si hay chat seleccionado
    if (chatRoomId && usuarioDestino) {
        document.getElementById('chat-with-title').textContent = `Charlando con ${usuarioDestino} 🌸`;
        
        document.getElementById('msgInput').disabled = false;
        document.getElementById('btnEnviarMsg').disabled = false;

        cargarMensajes(chatRoomId);
    }
    
    document.getElementById('msgInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') enviarMensajePrivado();
    });
});

function cargarMensajes(roomId) {
    const container = document.getElementById('messages-container');
    
    database.ref(`mensajes_privados/${roomId}`).on('value', (snapshot) => {
        container.innerHTML = ""; 
        
        if (!snapshot.exists()) {
            container.innerHTML = `<p style="text-align:center; color:gray; font-size:0.8rem; margin-top:20px;">Aquí comenzará tu conversación zen... ✨</p>`;
            return;
        }

        snapshot.forEach((child) => {
            const datos = child.val();
            const msgId = child.key; // ID único del mensaje en Firebase
            const msgDiv = document.createElement('div');
            
            const horaFormateada = new Date(datos.fecha).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
            });

            if (datos.remitente === miNombre) {
                msgDiv.className = "msg me";
                // Si el mensaje es mío, le asignamos el evento para poder borrarlo
                msgDiv.onclick = () => confirmarBorrarMensaje(msgId);
                msgDiv.title = "Haz clic para borrar mensaje 🗑️";
            } else {
                msgDiv.className = "msg other";
            }

            msgDiv.innerHTML = `
                <span class="msg-text">${datos.texto}</span>
                <span class="msg-time">${horaFormateada}</span>
            `;
            
            container.appendChild(msgDiv);
        });

        container.scrollTop = container.scrollHeight;
    });
}

// --- REEMPLAZA ESTA FUNCIÓN EN TU chats.js ORIGINAL PARA ENLAZAR LAS NOTIFICACIONES ---
function enviarMensajePrivado() {
    const input = document.getElementById('msgInput');
    const texto = input.value.trim();
    
    if (!texto || !chatRoomId) return;

    // 1. Guardamos el mensaje en la sala de chat privada
    database.ref(`mensajes_privados/${chatRoomId}`).push({
        remitente: miNombre,
        texto: texto,
        fecha: Date.now()
    }).then(() => {
        input.value = ""; // Limpiamos la caja de texto
        
        // 2. ¡Creamos la notificación para el destinatario en Firebase!
        const usuarioDestinoKey = usuarioDestino.replace(/[.#$[\]]/g, "_");
        database.ref(`notificaciones/${usuarioDestinoKey}`).push({
            titulo: `Mensaje privado de ${miNombre} 💬`,
            mensaje: texto.substring(0, 50), // Guardamos una vista previa del texto
            fecha: Date.now()
        });

    }).catch(err => console.error("Error al enviar mensaje:", err));
}

// Nueva función para eliminar el mensaje de Firebase
function confirmarBorrarMensaje(msgId) {
    const seguro = confirm("¿Quieres borrar este mensaje para todos? 🌸");
    if (seguro && chatRoomId) {
        database.ref(`mensajes_privados/${chatRoomId}/${msgId}`).remove()
            .then(() => console.log("Mensaje eliminado correctamente."))
            .catch(err => console.error("Error al eliminar mensaje:", err));
    }
}

