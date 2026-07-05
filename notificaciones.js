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
// Función para activar las notificaciones push del sistema
function activarNotificacionesPush() {
    // Verificar si el navegador soporta Service Workers y Notificaciones
    if (!('serviceWorker' in navigator) || !('Notification' in window)) {
        console.warn("Este navegador no soporta notificaciones push.");
        return;
    }

    // Solicitar permiso al usuario
    Notification.requestPermission().then((permiso) => {
        if (permiso === 'granted') {
            console.log("¡Permiso de notificaciones concedido! 🌸");
            
            // Obtener el token del dispositivo desde Firebase
            // Nota: Debes generar tu clave pública "VAPID" en la consola de Firebase 
            // (Configuración del proyecto > Mensajería en la nube > Configuración de Web Push)
            const CLAVE_PUBLICA_VAPID = "aOWdf4i63g2iC0jGRHVTVUIQZE1bxM1sqnxSncQKwCc";

            messaging.getToken({ vapidKey: CLAVE_PUBLICA_VAPID })
                .then((tokenActual) => {
                    if (tokenActual) {
                        console.log("Token obtenido con éxito.");
                        guardarTokenEnBaseDeDatos(tokenActual);
                    } else {
                        console.warn("No se pudo obtener el token. Verifica los permisos.");
                    }
                })
                .catch((err) => {
                    console.error("Error al obtener el token de Firebase:", err);
                });
        } else {
            console.warn("El usuario rechazó los permisos de notificación.");
        }
    });
}

// Guarda el token en la base de datos asociado al usuario actual
function guardarTokenEnBaseDeDatos(token) {
    const usuarioKey = miNombre.replace(/[.#$[\]]/g, "_");
    
    // Lo guardamos en una rama llamada 'tokens_push/nombre_usuario'
    database.ref(`tokens_push/${usuarioKey}`).set({
        token: token,
        actualizado: Date.now()
    })
    .then(() => console.log("Token push guardado en la base de datos correctamente. ✨"))
    .catch(err => console.error("Error al guardar el token:", err));
}
