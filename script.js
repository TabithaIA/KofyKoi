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
    // Convertimos los milisegundos a un objeto Date
    const fecha = new Date(datos.fecha);
    
    // Formateamos la fecha (ej: 23/05/2026) y la hora (ej: 14:30)
    const fechaFormateada = fecha.toLocaleDateString('es-AR');
    const horaFormateada = fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

    const postDiv = document.createElement('div');
    postDiv.className = 'card kofy-post';
    postDiv.dataset.id = id;
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
        ${datos.imagen ? `<img src="${datos.imagen}" style="width: 100%; border-radius: 10px; margin-top: 10px;">` : ''}
        
        <div style="font-size: 0.7rem; color: #888; margin-top: 8px;">
            Publicado el ${fechaFormateada} a las ${horaFormateada}
        </div>

        <div class="actions" style="display: flex; align-items: center; width: 100%; margin-top: 10px;">
            <span onclick="enviarLike('${id}')" style="cursor:pointer">❤️ <span id="likes-${id}">${datos.likes || 0}</span> Me gusta</span>
            <button class="btn-report" onclick="reportarPost('${id}', '${datos.usuario}', '${datos.mensaje}')">Reportar 🚩</button>
        </div>
    `;
    return postDiv;
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
                const maxAncho = 800;
                const escala = maxAncho / img.width;
                canvas.width = maxAncho;
                canvas.height = img.height * escala;
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                const fotoComprimida = canvas.toDataURL('image/jpeg', 0.6);
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

database.ref('posts/').on('child_changed', (snapshot) => {
    const likesSpan = document.getElementById(`likes-${snapshot.key}`);
    if (likesSpan) likesSpan.innerText = snapshot.val().likes || 0;
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
function verPerfil(nombre, avatar, bio) {
    const modal = document.getElementById('modalVistaPerfil');
    const miNombre = localStorage.getItem('kofy_nombre') || "@KofyUser";
    if (!modal) return;

    document.getElementById('vistaNombre').textContent = nombre;
    document.getElementById('vistaImg').src = avatar || 'https://i.pravatar.cc/150?u=default';
    document.getElementById('vistaBio').textContent = bio || "Sin biografía aún. ✨";
    
    const btnSeguir = document.getElementById('btnSeguir');
    if (nombre === miNombre) {
        if (btnSeguir) btnSeguir.style.display = "none";
    } else {
        if (btnSeguir) {
            btnSeguir.style.display = "block";
            database.ref(`seguidores/${nombre}/${miNombre}`).once('value', (s) => actualizarBotonSeguir(s.exists()));
        }
    }

    database.ref(`seguidores/${nombre}`).on('value', (s) => {
        const count = document.getElementById('countSeguidores');
        if (count) count.textContent = `${s.numChildren()} seguidores 🌸`;
    });
    modal.style.display = 'flex';
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

