// chats.js - Manejo del Chat Privado y Eliminación en Tiempo Real

const miNombre = localStorage.getItem('kofy_nombre') || "@KofyUser";
const miAvatar = localStorage.getItem('kofy_avatar') || "https://i.pravatar.cc/150?u=kofy";

// --- VINCULACIÓN CON LA TIENDA: Cargar color equipado en las salas grupales ---
let miColorBurbuja = localStorage.getItem('kofy_color_burbuja') || "#e0d8f0";

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
        
        // AGREGADO: Habilitar botón para adjuntar multimedia si existe en el HTML
        if (document.getElementById('btnAdjuntarMedia')) {
            document.getElementById('btnAdjuntarMedia').disabled = false;
        }
        
        // Habilitar y sincronizar el punto del círculo con tu color equipado
        const picker = document.getElementById('pickerBurbuja');
        if (picker) {
            picker.disabled = false;
            picker.value = miColorBurbuja; 
        }
        if (document.getElementById('btnFondoFoto')) {
            document.getElementById('btnFondoFoto').disabled = false;
        }

        cargarMensajes(chatRoomId);
    }
    
    document.getElementById('msgInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') enviarMensajePrivado();
    });
});

function cargarMensajes(roomId) {
    const container = document.getElementById('messages-container');
    
    // Escuchar el fondo personalizado desde el subnodo /config
    database.ref(`mensajes_privados/${roomId}/config/fondo`).on('value', (snapFondo) => {
        if (snapFondo.exists()) {
            container.style.backgroundImage = `url('${snapFondo.val()}')`;
        } else {
            container.style.backgroundImage = "none";
            container.style.backgroundColor = "#fafcff"; 
        }
    });

    // Escuchar los mensajes apuntando ordenadamente al subnodo /mensajes
    database.ref(`mensajes_privados/${roomId}/mensajes`).on('value', (snapshot) => {
        container.innerHTML = ""; 
        
        if (!snapshot.exists()) {
            container.innerHTML = `<p style="text-align:center; color:gray; font-size:0.8rem; margin-top:20px;">Aquí comenzará tu conversación zen... ✨</p>`;
            return;
        }

        snapshot.forEach((child) => {
            const datos = child.val();
            if (!datos) return; // Control de seguridad básico

            const msgId = child.key; 
            const msgDiv = document.createElement('div');
            
            const horaFormateada = new Date(datos.fecha).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
            });

            if (datos.remitente === miNombre) {
                msgDiv.className = "msg me";
                // Aplicar el color de burbuja que tenías guardado al enviar
                if (datos.colorBurbuja) {
                    msgDiv.style.backgroundColor = datos.colorBurbuja;
                }
                msgDiv.onclick = () => confirmarBorrarMensaje(msgId);
                msgDiv.title = "Haz clic para borrar mensaje 🗑️";
            } else {
                msgDiv.className = "msg other";
                // Aplicar el color de burbuja personalizado del otro usuario
                if (datos.colorBurbuja) {
                    msgDiv.style.backgroundColor = datos.colorBurbuja;
                }
            }

            // MODIFICACIÓN SEGURA: Renderizar según el tipo si existe, o usar texto plano por defecto
            let contenidoRenderizado = "";
            if (datos.tipo === "imagen") {
                contenidoRenderizado = `<img src="${datos.texto}" style="max-width: 100%; border-radius: 12px; margin-top: 5px; display: block;">`;
            } else if (datos.tipo === "video") {
                contenidoRenderizado = `<video src="${datos.texto}" controls style="max-width: 100%; border-radius: 12px; margin-top: 5px; display: block;"></video>`;
            } else if (datos.tipo === "audio") {
                contenidoRenderizado = `<audio src="${datos.texto}" controls style="max-width: 100%; margin-top: 5px; display: block;"></audio>`;
            } else {
                // Mensajes de texto normales y mensajes antiguos sin el campo 'tipo'
                contenidoRenderizado = `<span class="msg-text">${datos.texto}</span>`;
            }

            msgDiv.innerHTML = `
                ${contenidoRenderizado}
                <span class="msg-time">${horaFormateada}</span>
            `;
            
            container.appendChild(msgDiv);
        });

        container.scrollTop = container.scrollHeight;
    });
}

function enviarMensajePrivado() {
    const input = document.getElementById('msgInput');
    const texto = input.value.trim();
    
    if (!texto || !chatRoomId) return;

    // Guardar dentro de /mensajes adjuntando el color de burbuja activo
    database.ref(`mensajes_privados/${chatRoomId}/mensajes`).push({
        remitente: miNombre,
        texto: texto,
        fecha: Date.now(),
        colorBurbuja: miColorBurbuja 
    }).then(() => {
        input.value = ""; 
        
        const usuarioDestinoKey = usuarioDestino.replace(/[.#$[\]]/g, "_");
        database.ref(`notificaciones/${usuarioDestinoKey}`).push({
            titulo: `Mensaje privado de ${miNombre} 💬`,
            mensaje: texto.substring(0, 50), 
            fecha: Date.now()
        });

    }).catch(err => console.error("Error al enviar mensaje:", err));
}

function confirmarBorrarMensaje(msgId) {
    const seguro = confirm("¿Quieres borrar este mensaje para todos? 🌸");
    if (seguro && chatRoomId) {
        database.ref(`mensajes_privados/${chatRoomId}/mensajes/${msgId}`).remove()
            .then(() => console.log("Mensaje eliminado correctamente."))
            .catch(err => console.error("Error al eliminar mensaje:", err));
    }
}

// Actualizar color dinámicamente usando el círculo deslizante de colores
function actualizarColorDesdePicker(colorHex) {
    miColorBurbuja = colorHex;
    localStorage.setItem('kofy_color_burbuja', colorHex);
}

// Abrir imagen, optimizar el tamaño por Canvas y subir el base64 a Firebase
function procesarYSubirFondo(inputElement) {
    if (!inputElement.files || !inputElement.files[0] || !chatRoomId) return;

    const archivo = inputElement.files[0];
    const lector = new FileReader();

    lector.onload = function(evento) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // Dimensiones para Full HD móvil fluido optimizado
            const MAX_WIDTH = 800;
            const MAX_HEIGHT = 1200;
            let ancho = img.width;
            let alto = img.height;

            if (ancho > alto) {
                if (ancho > MAX_WIDTH) {
                    alto *= MAX_WIDTH / ancho;
                    ancho = MAX_WIDTH;
                }
            } else {
                if (alto > MAX_HEIGHT) {
                    ancho *= MAX_HEIGHT / alto;
                    alto = MAX_HEIGHT;
                }
            }

            canvas.width = ancho;
            canvas.height = alto;
            ctx.drawImage(img, 0, 0, ancho, alto);

            // Exportar comprimido a calidad equilibrada (JPEG 0.6)
            const imagenOptimizadaBase64 = canvas.toDataURL('image/jpeg', 0.6);

            database.ref(`mensajes_privados/${chatRoomId}/config`).update({
                fondo: imagenOptimizadaBase64
            }).then(() => {
                alert("¡Fondo del chat privado actualizado y sincronizado! 🖼️✨");
            }).catch(err => console.error("Error al guardar el fondo:", err));
        };
        img.src = evento.target.result;
    };
    lector.readAsDataURL(archivo);
}

// ============================================================================
// AGREGADO: Funciones de Optimización y Envío de Archivos Multimedia
// ============================================================================

function procesarYEnviarMedia(inputElement) {
    if (!inputElement.files || !inputElement.files[0] || !chatRoomId) return;

    const archivo = inputElement.files[0];
    const tipoMime = archivo.type;
    const lector = new FileReader();

    // 1. IMÁGENES: Redimensionar con canvas a JPEG 0.5 para ahorrar espacio
    if (tipoMime.startsWith('image/')) {
        lector.onload = function(evento) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                const MAX_WIDTH = 600; 
                let ancho = img.width;
                let alto = img.height;

                if (ancho > MAX_WIDTH) {
                    alto *= MAX_WIDTH / ancho;
                    ancho = MAX_WIDTH;
                }

                canvas.width = ancho;
                canvas.height = alto;
                ctx.drawImage(img, 0, 0, ancho, alto);

                const imagenComprimidaBase64 = canvas.toDataURL('image/jpeg', 0.5);
                subirMensajeMultimedia(imagenComprimidaBase64, "imagen");
            };
            img.src = evento.target.result;
        };
        lector.readAsDataURL(archivo);

    // 2. VIDEOS: Validar peso máximo para prevenir congelamientos en tiempo real
    } else if (tipoMime.startsWith('video/')) {
        if (archivo.size > 2.5 * 1024 * 1024) {
            alert("El video supera el tamaño zen de 2.5 MB. ¡Prueba con un clip más corto! 🎬");
            return;
        }
        lector.onload = function(evento) {
            subirMensajeMultimedia(evento.target.result, "video");
        };
        lector.readAsDataURL(archivo);

    // 3. AUDIO / MÚSICA: Validar peso máximo antes de codificar
    } else if (tipoMime.startsWith('audio/')) {
        if (archivo.size > 3 * 1024 * 1024) {
            alert("El archivo musical supera el límite zen de 3 MB. 🎵");
            return;
        }
        lector.onload = function(evento) {
            subirMensajeMultimedia(evento.target.result, "audio");
        };
        lector.readAsDataURL(archivo);
    }
    
    inputElement.value = ""; // Resetear selector
}

function subirMensajeMultimedia(base64Data, tipoContenido) {
    database.ref(`mensajes_privados/${chatRoomId}/mensajes`).push({
        remitente: miNombre,
        texto: base64Data, 
        tipo: tipoContenido, 
        fecha: Date.now(),
        colorBurbuja: miColorBurbuja 
    }).then(() => {
        const usuarioDestinoKey = usuarioDestino.replace(/[.#$[\]]/g, "_");
        database.ref(`notificaciones/${usuarioDestinoKey}`).push({
            titulo: `Mensaje privado de ${miNombre} 💬`,
            mensaje: `Te envió un archivo multimedia (${tipoContenido}) 📂`, 
            fecha: Date.now()
        });
    }).catch(err => console.error("Error al subir multimedia:", err));
}

