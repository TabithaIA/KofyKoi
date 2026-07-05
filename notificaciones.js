// notificaciones.js - Lógica de Alertas en Tiempo Real para KofyKoi

const miNombre = localStorage.getItem('kofy_nombre') || "@KofyUser";
const miAvatar = localStorage.getItem('kofy_avatar') || "https://i.pravatar.cc/150?u=kofy";

// Variable de control para evitar que las notificaciones viejas 
// salten como alertas nuevas al cargar la página por primera vez
let cargaInicialCompletada = false;

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

    // === DETECTOR EN TIEMPO REAL: Hace saltar la alerta emergente al llegar ===
    database.ref(`notificaciones/${usuarioKey}`).on('child_added', (snapshot) => {
        // Si la página se está abriendo recién, ignoramos el aviso flotante de lo viejo
        if (!cargaInicialCompletada) return;

        const noti = snapshot.val();
        
        // Detectar si es formato nuevo (v1) o viejo
        const tituloReal = noti.notification ? noti.notification.title : (noti.titulo || "Nuevo mensaje 💬");
        const cuerpoReal = noti.notification ? noti.notification.body : (noti.mensaje || "Te enviaron algo... ✨");

        // Disparar la notificación nativa del sistema operativo
        if (Notification.permission === 'granted') {
            new Notification(tituloReal, {
                body: cuerpoReal,
                icon: 'favicon.png' // Asegúrate de que apunte a tu icono
            });
        }
    });

    // === LÓGICA DE INTERFAZ: Redibujar el listado zen en pantalla ===
    database.ref(`notificaciones/${usuarioKey}`).on('value', (snapshot) => {
        container.innerHTML = "";

        if (!snapshot.exists()) {
            container.innerHTML = `
                <div class="empty-state">
                    <p style="font-size: 2.5rem; margin-bottom: 10px;">🌸</p>
                    <p>Todo está en perfecta calma por aquí.<br>No tienes notificaciones pendientes.</p>
                </div>
            `;
            cargaInicialCompletada = true; // Si está vacío, la carga inicial ya terminó
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

            // Detectar dinámicamente si es formato nuevo (v1) o viejo
            const tituloReal = noti.notification ? noti.notification.title : (noti.titulo || "Nuevo mensaje 💬");
            const cuerpoReal = noti.notification ? noti.notification.body : (noti.mensaje || "Te enviaron algo... ✨");

            card.innerHTML = `
                <div class="noti-content">
                    <span class="noti-title">${tituloReal}</span>
                    <span class="noti-text">${cuerpoReal}</span>
                    <span class="noti-time">${hora}</span>
                </div>
                <button class="btn-delete-noti" onclick="quitarNotificacion('${noti.id}')" title="Quitar alerta">✕</button>
            `;

            container.appendChild(card);
        });

        // Una vez que se dibuja toda la lista existente, habilitamos las alertas para los nuevos impactos
        cargaInicialCompletada = true;
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

// Función para activar las notificaciones push del sistema y obtener el token
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
            
            // Tu clave pública VAPID configurada correctamente
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

