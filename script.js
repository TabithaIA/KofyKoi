// --- VARIABLES GLOBALES Y ESTADO ---
let currentAvatarUrl = localStorage.getItem('kofy_avatar') || "https://i.pravatar.cc/150?u=kofy";
let cargaInicialCompletada = false;
let ultimoPostFecha = null;
let cargandoMas = false;

// --- CONFIGURACIÓN DE NOTIFICACIONES ---
if ('Notification' in window && 'serviceWorker' in navigator) {
    Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
            console.log("¡Permiso de notificaciones concedido! 🌸");
            navigator.serviceWorker.register('sw.js');
        }
    });
}

// --- LÓGICA DE PERFIL ---
function previewImagen(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => document.getElementById('previewPerfil').src = e.target.result;
        reader.readAsDataURL(input.files[0]);
    }
}

function abrirModal() {
    const modal = document.getElementById('modalPerfil');
    if (modal) {
        modal.style.display = 'flex';
        document.getElementById('editNombre').value = document.getElementById('nombrePerfil').textContent;
        document.getElementById('editBio').value = document.getElementById('bioPerfil').textContent;
        document.getElementById('previewPerfil').src = currentAvatarUrl;
    }
}

function cerrarModal() {
    const modal = document.getElementById('modalPerfil');
    if (modal) modal.style.display = 'none';
}

function guardarPerfil() {
    currentAvatarUrl = document.getElementById('previewPerfil').src;
    const nuevoNombre = document.getElementById('editNombre').value;
    const nuevaBio = document.getElementById('editBio').value;

    if(document.getElementById('nombrePerfil')) document.getElementById('nombrePerfil').textContent = nuevoNombre;
    if(document.getElementById('bioPerfil')) document.getElementById('bioPerfil').textContent = nuevaBio;
    if(document.getElementById('imgPerfil')) document.getElementById('imgPerfil').src = currentAvatarUrl;
    
    document.getElementById('imgNav').src = currentAvatarUrl;
    document.getElementById('nav-username').textContent = nuevoNombre;

    localStorage.setItem('kofy_nombre', nuevoNombre);
    localStorage.setItem('kofy_bio', nuevaBio);
    localStorage.setItem('kofy_avatar', currentAvatarUrl);

    cerrarModal();
}

// --- LÓGICA DE STORIES (24 HORAS) ---

function subirStory(input) {
    const archivo = input.files[0];
    if (!archivo) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.src = e.target.result;
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // --- OPTIMIZACIÓN ---
            // Definimos un tamaño máximo (ej. 500px de ancho)
            const maxAncho = 500;
            const escala = maxAncho / img.width;
            canvas.width = maxAncho;
            canvas.height = img.height * escala;

            // Dibujamos la imagen reescalada
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            // Convertimos a JPEG con calidad 0.4 (40%)
            // Esto reduce el peso de ~2MB a unos ~30KB o menos
            const fotoOptimizada = canvas.toDataURL('image/jpeg', 0.4);
            
            const miNombre = localStorage.getItem('kofy_nombre') || "@KofyUser";

            database.ref('stories/').push({
                usuario: miNombre,
                imagen: fotoOptimizada,
                avatar: currentAvatarUrl,
                fecha: Date.now()
            });
            alert("¡Story publicada! ✨");
        };
    };
    reader.readAsDataURL(archivo);
}

// --- CARGA Y LIMPIEZA DE STORIES EN TIEMPO REAL ---
database.ref('stories/').on('value', (snapshot) => {
    const container = document.getElementById('stories-container');
    if (!container) return;

    container.innerHTML = ""; // Limpiamos para redibujar
    const ahora = Date.now();
    const unDiaEnMs = 24 * 60 * 60 * 1000;

    snapshot.forEach((child) => {
        const datos = child.val();
        const idStory = child.key;

        // Si es menor a 24 horas, la mostramos
        if (ahora - datos.fecha < unDiaEnMs) {
            const storyCircle = document.createElement('div');
            storyCircle.style.textAlign = "center";
            storyCircle.innerHTML = `
                <img src="${datos.avatar}" class="avatar-sm" 
                     style="border: 3px solid var(--rosa); padding: 2px; cursor: pointer;"
                     onclick="verStory('${datos.imagen}', '${datos.usuario}', '${idStory}')">
                <br><small style="font-size: 0.6rem;">${datos.usuario.split('@')[1] || datos.usuario}</small>
            `;
            container.appendChild(storyCircle);
        } else {
            // --- LIMPIEZA AUTOMÁTICA ---
            // Si ya expiró, la borramos de la base de datos definitivamente
            database.ref(`stories/${idStory}`).remove()
                .then(() => console.log("Story antigua eliminada del servidor 🌸"))
                .catch(err => console.error("Error al limpiar:", err));
        }
    });
});

function verStory(imgUrl, usuario, idStory) {
    const miNombre = localStorage.getItem('kofy_nombre') || "@KofyUser";
    const modalStory = document.createElement('div');
    modalStory.className = 'modal';
    modalStory.style.display = 'flex';
    
    // Si la story es mía, muestro el botón de basura
    const botonBorrar = (usuario === miNombre) 
        ? `<button onclick="borrarStory('${idStory}', this)" style="background:rgba(255,0,0,0.7); color:white; padding:10px; border-radius:50%; position:absolute; bottom:20px; right:20px;">🗑️</button>` 
        : '';

    modalStory.innerHTML = `
        <div class="modal-content" style="position: relative; background: #000; border: none; width: 90%; max-width: 400px; padding:0;">
            <span onclick="this.parentElement.parentElement.remove()" 
                  style="position: absolute; top: 10px; right: 20px; color: white; font-size: 2rem; cursor: pointer; z-index:10;">&times;</span>
            <img src="${imgUrl}" style="width: 100%; border-radius: 15px; display:block;">
            <div style="position:absolute; bottom:10px; left:20px; color:white; text-align:left;">
                <p style="font-weight: bold; text-shadow: 1px 1px 2px black;">${usuario}</p>
            </div>
            ${botonBorrar}
        </div>
    `;
    document.body.appendChild(modalStory);
}

// Función para ejecutar el borrado
function borrarStory(id, btn) {
    if (confirm("¿Quieres eliminar tu story antes de tiempo?")) {
        database.ref(`stories/${id}`).remove();
        btn.parentElement.parentElement.remove(); // Cierra el modal
    }
}

// --- LÓGICA DE POSTS (FEED) ---

// 1. Escuchar posts NUEVOS en tiempo real
database.ref('posts/').limitToLast(1).on('child_added', (snapshot) => {
    if (!cargaInicialCompletada) return; 
    
    const datos = snapshot.val();
    const idS = snapshot.key;
    const feed = document.getElementById('feed-container');

    if (feed) {
        const postDiv = crearElementoPost(idS, datos);
        feed.prepend(postDiv);
        mostrarNotificacion(datos.usuario, datos.mensaje);
    }
});

// 2. Cargar bloques de posts (Paginación/Scroll Infinito)
function cargarMasPosts() {
    if (cargandoMas) return;
    cargandoMas = true;

    let consulta = database.ref('posts/').orderByChild('fecha');
    
    // Si ya tenemos un post, pedimos los anteriores a ese
    if (ultimoPostFecha) {
        consulta = consulta.endAt(ultimoPostFecha - 1);
    }

    consulta.limitToLast(6).once('value', (snapshot) => {
        const feed = document.getElementById('feed-container');
        const posts = [];

        snapshot.forEach(child => {
            // Verificamos si el post ya existe en el DOM para no repetirlo
            if (!document.querySelector(`[data-id="${child.key}"]`)) {
                posts.push({ id: child.key, ...child.val() });
            }
        });

        if (posts.length > 0) {
            if (!ultimoPostFecha) feed.innerHTML = ""; 
            
            posts.reverse(); 
            const fragmento = document.createDocumentFragment();
            
            posts.forEach(p => {
                const postDiv = crearElementoPost(p.id, p);
                fragmento.appendChild(postDiv);
            });
            
            feed.appendChild(fragmento);
            // Actualizamos la fecha del último post del array (que es el más viejo)
            ultimoPostFecha = posts[posts.length - 1].fecha;
        }
        
        // Importante: resetear el estado para permitir la siguiente carga
        cargandoMas = false;
        cargaInicialCompletada = true;
    });
}

// 3. Generador de HTML de Post (Mantenida fuera para reusabilidad)
function crearElementoPost(id, datos) {
    const fecha = new Date(datos.fecha);
    const fechaFormateada = fecha.toLocaleDateString('es-AR');
    const horaFormateada = fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    const miNombre = localStorage.getItem('kofy_nombre') || "@KofyUser";

    const postDiv = document.createElement('div');
    postDiv.className = 'card kofy-post';
    postDiv.dataset.id = id;
    
    // Construimos la lista de comentarios existentes
    let comentariosHTML = '';
    if (datos.comentarios) {
        Object.keys(datos.comentarios).forEach(comentarioId => {
            const c = datos.comentarios[comentarioId];
            
            // El botón de borrar sale si el comentario es tuyo O si tú eres el dueño del post principal
            const puedeBorrar = (c.usuario === miNombre || datos.usuario === miNombre);
            const botonBorrarC = puedeBorrar 
                ? `<button onclick="borrarComentario('${id}', '${comentarioId}')" style="background:none; border:none; cursor:pointer; font-size:0.75rem; margin-left:auto;">🗑️</button>` 
                : '';

            comentariosHTML += `
                <div class="comment-item" style="display: flex; align-items: center; justify-content: space-between; gap: 10px;">
                    <div>
                        <strong onclick="verPerfil('${c.usuario}', '', '')" style="cursor:pointer; color:var(--morado-deep)">
                            ${c.usuario}
                        </strong>: ${c.mensaje}
                    </div>
                    ${botonBorrarC}
                </div>
            `;
        });
    }

    postDiv.innerHTML = `
        <div class="post-header" style="display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 10px;">
                <img src="${datos.avatar || 'https://i.pravatar.cc/150?u=default'}" class="avatar-sm">
                <strong onclick="verPerfil('${datos.usuario}', '${datos.avatar}', '${datos.biografia || ''}')" style="cursor:pointer; color:var(--morado-deep)">
                    ${datos.usuario}
                </strong>
            </div>
            <button onclick="borrarPost('${id}')" style="background:none; border:none; cursor:pointer;">🗑️</button>
        </div>
        <p>${datos.mensaje}</p>
        ${datos.imagen ? `<img src="${datos.imagen}" loading="lazy" style="width: 100%; border-radius: 10px; margin-top: 10px;">` : ''}
        
        <div style="font-size: 0.7rem; color: #888; margin-top: 8px;">
            Publicado el ${fechaFormateada} a las ${horaFormateada}
        </div>

        <div class="actions" style="display: flex; align-items: center; width: 100%; margin-top: 10px;">
            <span onclick="enviarLike('${id}')" style="cursor:pointer">❤️ <span id="likes-${id}">${datos.likes || 0}</span> Me gusta</span>
            <button class="btn-report" onclick="reportarPost('${id}', '${datos.usuario}', '${datos.mensaje}')">Reportar 🚩</button>
        </div>

        <div class="comments-section">
            <div class="comments-list" id="comments-list-${id}">
                ${comentariosHTML}
            </div>
            <div class="comment-form">
                <input type="text" class="input-comment" id="input-comment-${id}" placeholder="Escribe un comentario zen...">
                <button class="btn-main" style="padding: 5px 12px; font-size: 0.8rem; border-radius: 12px;" onclick="publicarComentario('${id}')">Enviar</button>
            </div>
        </div>
    `;
    return postDiv;
}

function publicarComentario(idPost) {
    const miNombre = localStorage.getItem('kofy_nombre') || "@KofyUser";
    const input = document.getElementById(`input-comment-${idPost}`);
    if (!input) return;
    
    const textoComentario = input.value.trim();
    if (!textoComentario) return;

    // Guardamos el comentario dentro de la estructura del post en Firebase
    database.ref(`posts/${idPost}/comentarios`).push({
        usuario: miNombre,
        mensaje: textoComentario,
        fecha: Date.now()
    }).then(() => {
        input.value = ""; // Limpiamos el input
    }).catch(err => console.error("Error al comentar:", err));
}

// --- DETECTAR SCROLL ---
const observer = new IntersectionObserver((entries) => {
    // Solo cargamos si el elemento es visible Y no estamos ya cargando algo
    if (entries[0].isIntersecting && !cargandoMas) {
        cargarMasPosts();
    }
}, { 
    threshold: 0.5, // Espera a que el sentinel se vea un 50%
    rootMargin: "100px" // Carga un poquito antes de llegar al final para que sea fluido
});

// --- LÓGICA DE PUBLICACIÓN (CON COMPRESIÓN) ---
function publicar() {
    const nombre = localStorage.getItem('kofy_nombre') || "@KofyUser";
    const texto = document.getElementById('postText').value;
    const inputImagen = document.getElementById('postImage');
    const archivo = inputImagen ? inputImagen.files[0] : null;

    if (!texto && !archivo) return alert("¡Escribe algo o sube una foto! 🌸");

    if (archivo) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const img = new Image();
            img.src = e.target.result;
            img.onload = function () {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const maxAncho = 600;
                const escala = maxAncho / img.width;
                canvas.width = maxAncho;
                canvas.height = img.height * escala;
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                const fotoComprimida = canvas.toDataURL('image/jpeg', 0.5);
                enviarPost(nombre, texto, fotoComprimida);
            };
        };
        reader.readAsDataURL(archivo);
    } else {
        enviarPost(nombre, texto, "");
    }
}

function enviarPost(usuario, mensaje, imagenData) {
    const bioActual = localStorage.getItem('kofy_bio') || "";
    database.ref('posts/').push({
        usuario: usuario,
        mensaje: mensaje,
        imagen: imagenData,
        avatar: currentAvatarUrl,
        biografia: bioActual,
        fecha: Date.now(),
        likes: 0
    });
    document.getElementById('postText').value = "";
    if (document.getElementById('postImage')) document.getElementById('postImage').value = "";
}

// --- INTERACCIONES: LIKES, BORRADO, REPORTES ---
function enviarLike(idPost) {
    const miNombre = localStorage.getItem('kofy_nombre') || "@KofyUser";
    const postRef = database.ref(`posts/${idPost}`);
    const userLikeRef = database.ref(`posts/${idPost}/usuariosLikes/${miNombre.replace(/[.#$[\]]/g, "_")}`);

    userLikeRef.once('value').then((snapshot) => {
        if (snapshot.exists()) {
            userLikeRef.remove();
            postRef.child('likes').transaction(c => (c || 1) - 1);
        } else {
            userLikeRef.set(true);
            postRef.child('likes').transaction(c => (c || 0) + 1);
        }
    });
}

// Escucha cambios en los posts (por ejemplo, cuando alguien añade un comentario nuevo)
database.ref('posts/').on('child_changed', (snapshot) => {
    const idPost = snapshot.key;
    const datos = snapshot.val();
    const miNombre = localStorage.getItem('kofy_nombre') || "@KofyUser";
    
    // 1. Actualizar Likes
    const likesSpan = document.getElementById(`likes-${idPost}`);
    if (likesSpan) likesSpan.innerText = datos.likes || 0;

    // 2. Actualizar Comentarios en tiempo real con opción de borrado y enlace al perfil
    const listaComentarios = document.getElementById(`comments-list-${idPost}`);
    if (listaComentarios) {
        listaComentarios.innerHTML = ""; // Limpiamos la lista vieja
        
        if (datos.comentarios) {
            Object.keys(datos.comentarios).forEach(comentarioId => {
                const c = datos.comentarios[comentarioId];
                
                const puedeBorrar = (c.usuario === miNombre || datos.usuario === miNombre);
                const botonBorrarC = puedeBorrar 
                    ? `<button onclick="borrarComentario('${idPost}', '${comentarioId}')" style="background:none; border:none; cursor:pointer; font-size:0.75rem; margin-left:auto;">🗑️</button>` 
                    : '';

                const item = document.createElement('div');
                item.className = 'comment-item';
                item.style.display = 'flex';
                item.style.alignItems = 'center';
                item.style.justifyContent = 'space-between';
                item.style.gap = '10px';
                
                item.innerHTML = `
                    <div>
                        <strong onclick="verPerfil('${c.usuario}', '', '')" style="cursor:pointer; color:var(--morado-deep)">
                            ${c.usuario}
                        </strong>: ${c.mensaje}
                    </div>
                    ${botonBorrarC}
                `;
                listaComentarios.appendChild(item);
            });
            listaComentarios.scrollTop = listaComentarios.scrollHeight;
        }
    }
});

function borrarPost(id) {
    if (confirm("¿Seguro que quieres borrar este recuerdo? 🌸")) {
        database.ref(`posts/${id}`).remove();
    }
}

database.ref('posts/').on('child_removed', (snapshot) => {
    const el = document.querySelector(`[data-id="${snapshot.key}"]`);
    if (el) el.remove();
});

function borrarComentario(idPost, idComentario) {
    if (confirm("¿Seguro que quieres eliminar este comentario? 🌸")) {
        database.ref(`posts/${idPost}/comentarios/${idComentario}`).remove()
            .then(() => console.log("Comentario eliminado con éxito"))
            .catch(err => console.error("Error al eliminar comentario:", err));
    }
}

function reportarPost(idPost, usuario, mensaje) {
    const miNombre = localStorage.getItem('kofy_nombre') || "@KofyUser";
    if (confirm(`¿Quieres reportar este mensaje? 🚩`)) {
        database.ref('reportes/').push({
            reportado_por: miNombre,
            usuario_infractor: usuario,
            mensaje_reportado: mensaje,
            id_del_post: idPost,
            fecha: Date.now()
        }).then(() => alert("Gracias por cuidar KofyKoi. 🌸"));
    }
}

// --- VISTA PERFIL Y SEGUIDORES ---
// --- MODIFICACIÓN EN VISTA PERFIL (script.js) ---
function verPerfil(nombre, avatar, bio) {
    const modal = document.getElementById('modalVistaPerfil');
    const miNombre = localStorage.getItem('kofy_nombre') || "@KofyUser";
    if (!modal) return;

    document.getElementById('vistaNombre').textContent = nombre;
    document.getElementById('vistaImg').src = avatar || 'https://i.pravatar.cc/150?u=default';
    document.getElementById('vistaBio').textContent = bio || "Sin biografía aún. ✨";
    
    const btnSeguir = document.getElementById('btnSeguir');
    const btnChatear = document.getElementById('btnChatear'); // <--- Capturamos el nuevo botón

    if (nombre === miNombre) {
        if (btnSeguir) btnSeguir.style.display = "none";
        if (btnChatear) btnChatear.style.display = "none"; // No podés chatear con vos mismo
    } else {
        if (btnSeguir) {
            btnSeguir.style.display = "block";
            database.ref(`seguidores/${nombre}/${miNombre}`).once('value', (s) => actualizarBotonSeguir(s.exists()));
        }
        if (btnChatear) {
            btnChatear.style.display = "block";
            // Al hacer clic, genera la sala y redirige
            btnChatear.onclick = () => abrirChatPrivado(nombre);
        }
    }

    database.ref(`seguidores/${nombre}`).on('value', (s) => {
        const count = document.getElementById('countSeguidores');
        if (count) count.textContent = `${s.numChildren()} seguidores 🌸`;
    });
    modal.style.display = 'flex';
}

// Nueva función para redireccionar al chat
function abrirChatPrivado(usuarioDestino) {
    const miNombre = localStorage.getItem('kofy_nombre') || "@KofyUser";
    
    // Creamos un ID único de chat ordenando los nombres alfabéticamente. 
    // Así, no importa quién inicie el chat, el ID del canal "Ema y Juan" será siempre el mismo: "Ema_Juan"
    const idsOrdenados = [miNombre.replace(/[.#$[\]]/g, "_"), usuarioDestino.replace(/[.#$[\]]/g, "_")].sort();
    const chatRoomId = `${idsOrdenados[0]}_${idsOrdenados[1]}`;

    // Guardamos temporalmente en el localStorage con quién vamos a hablar para que chats.html lo sepa
    localStorage.setItem('chat_actual_id', chatRoomId);
    localStorage.setItem('chat_actual_destino', usuarioDestino);

    // Redireccionamos a la nueva página
    location.href = 'privchat.html';
}

function seguirUsuario(nombreSeguido) {
    const miNombre = localStorage.getItem('kofy_nombre') || "@KofyUser";
    if (miNombre === nombreSeguido) return;
    const ref = database.ref(`seguidores/${nombreSeguido}/${miNombre}`);
    ref.get().then((s) => {
        s.exists() ? ref.remove() : ref.set(true);
        actualizarBotonSeguir(!s.exists());
    });
}

function actualizarBotonSeguir(siguiendo) {
    const btn = document.getElementById('btnSeguir');
    if (btn) btn.textContent = siguiendo ? "Siguiendo ✨" : "Seguir 🌸";
}

function cerrarVista() {
    const modal = document.getElementById('modalVistaPerfil');
    if (modal) modal.style.display = 'none';
}

function mostrarNotificacion(usuario, mensaje) {
    const miNombre = localStorage.getItem('kofy_nombre') || "@KofyUser";
    if (usuario === miNombre) return;

    const toast = document.createElement('div');
    toast.className = 'notification-toast';
    toast.innerHTML = `<strong>${usuario}:</strong> ${mensaje.substring(0, 25)}...`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

// --- CARGA INICIAL AL CARGAR LA PÁGINA ---
document.addEventListener('DOMContentLoaded', () => {
    const n = localStorage.getItem('kofy_nombre');
    const b = localStorage.getItem('kofy_bio');
    const a = localStorage.getItem('kofy_avatar');

    if (n) {
        document.getElementById('nav-username').textContent = n;
        if(document.getElementById('nombrePerfil')) document.getElementById('nombrePerfil').textContent = n;
        database.ref(`seguidores/${n}`).on('value', (s) => {
            const c = document.getElementById('misSeguidoresCount');
            if (c) c.textContent = `${s.numChildren()} seguidores`;
        });
    }
    if (b && document.getElementById('bioPerfil')) document.getElementById('bioPerfil').textContent = b;
    if (a) {
        currentAvatarUrl = a;
        document.getElementById('imgNav').src = a;
        if(document.getElementById('imgPerfil')) document.getElementById('imgPerfil').src = a;
    }

    const sentinel = document.getElementById('sentinel');
    if (sentinel) observer.observe(sentinel);
    
    cargarMasPosts();
});

// --- ESCUCHAR SI LLEGAN MENSAJES PRIVADOS NUEVOS PARA MÍ ---
database.ref('mensajes_privados/').on('child_changed', (snapshot) => {
    const roomId = snapshot.key;
    const miNombre = localStorage.getItem('kofy_nombre') || "@KofyUser";

    // Verificamos si esta sala de chat me pertenece (si mi nombre está en el ID de la sala)
    if (roomId.includes(miNombre.replace(/[.#$[\]]/g, "_"))) {
        
        // Obtenemos el último mensaje que llegó a esa sala
        database.ref(`mensajes_privados/${roomId}`).limitToLast(1).once('value', (msgSnapshot) => {
            msgSnapshot.forEach((child) => {
                const datos = child.val();
                
                // Si el mensaje NO lo envié yo, significa que me lo enviaron a mí
                if (datos.remitente !== miNombre) {
                    // Usamos tu función nativa para avisarle en pantalla
                    mostrarNotificacion(`${datos.remitente} (Privado)`, datos.texto);
                }
            });
        });
    }
});
