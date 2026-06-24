// notificaciones.js - Lógica de Alertas en Tiempo Real para KofyKoi

const miNombre = localStorage.getItem('kofy_nombre') || "@KofyUser";
const miAvatar = localStorage.getItem('kofy_avatar') || "https://i.pravatar.cc/150?u=kofy";

document.addEventListener('DOMContentLoaded', () => {
    // 1. Cargar datos del usuario en la barra superior
    document.getElementById('nav-username').textContent = miNombre;
    document.getElementById('imgNav').src = miAvatar;

    // 2. Escuchar la base de datos de notificaciones para este usuario
    cargarNotificaciones();
});

function cargarNotificaciones() {
    const container = document.getElementById('noti-list-container');
    // Sanitizamos el nombre del usuario para que Firebase no de error de llaves
    const usuarioKey = miNombre.replace(/[.#$[\\]]/g, "_");

    database.ref(`notificaciones/${usuarioKey}`).on('value', (snapshot) => {
        container.innerHTML = "";

        if (!snapshot.exists()) {
            container.innerHTML = `
                <div class=\"empty-state\">
                    <p style=\"font-size: 2.5rem; margin-bottom: 10px;\">🌸</p>\n                    <p>Todo está en perfecta calma por aquí.<br>No tienes notificaciones pendientes.</p>
                </div>
            `;
            return;
        }

        // Metemos las notificaciones en un array para mostrarlas al revés (las más nuevas arriba)
        let listado = [];
        snapshot.forEach((child) => {
            listado.push({ id: child.key, ...child.val() });
        });
        listado.reverse();

        listado.forEach((noti) => {
            const card = document.createElement('div');
            card.className = "noti-card";
            
            const hora = new Date(noti.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            // === SOLUCIÓN AQUÍ: Detectar dinámicamente si es formato nuevo (v1) o viejo ===
            const tituloReal = noti.notification ? noti.notification.title : (noti.titulo || "Nuevo mensaje 💬");
            const cuerpoReal = noti.notification ? noti.notification.body : (noti.mensaje || "Te enviaron algo... ✨");

            card.innerHTML = `
                <div class=\"noti-content\">
                    <span class=\"noti-title\">${tituloReal}</span>
                    <span class=\"noti-text\">${cuerpoReal}</span>
                    <span class=\"noti-time\">${hora}</span>
                </div>
                <button class=\"btn-delete-noti\" onclick=\"quitarNotificacion('${noti.id}')\" title=\"Quitar alerta\">✕</button>
            `;

            container.appendChild(card);
        });
    });
}

// Borra una notificación individual al tocar la '✕'
function quitarNotificacion(notiId) {
    const usuarioKey = miNombre.replace(/[.#$[\]]/g, "_");
    database.ref(`notificaciones/${usuarioKey}/${notiId}`).remove()
        .catch(err => console.error("Error al quitar notificación:", err));
}

// Vacía por completo la rama de notificaciones de este usuario
function vaciarTodasLasNotificaciones() {
    if (confirm("¿Quieres limpiar todas tus notificaciones? ✨")) {
        const usuarioKey = miNombre.replace(/[.#$[\]]/g, "_");
        database.ref(`notificaciones/${usuarioKey}`).remove()
            .catch(err => console.error("Error al vaciar notificaciones:", err));
    }
}
