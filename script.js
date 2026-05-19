// --- LÓGICA DE PERFIL Y CONFIGURACIÓN ---
let currentAvatarUrl = localStorage.getItem('kofy_avatar') || "https://i.pravatar.cc/150?u=kofy";

if ('Notification' in window && 'serviceWorker' in navigator) {
    Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
            console.log("¡Permiso de notificaciones concedido! 🌸");
            navigator.serviceWorker.register('sw.js');
        }
    });
}

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

    document.getElementById('nombrePerfil').textContent = nuevoNombre;
    document.getElementById('bioPerfil').textContent = nuevaBio;
    document.getElementById('imgPerfil').src = currentAvatarUrl;
    document.getElementById('imgNav').src = currentAvatarUrl;
    document.getElementById('nav-username').textContent = nuevoNombre;

    localStorage.setItem('kofy_nombre', nuevoNombre);
    localStorage.setItem('kofy_bio', nuevaBio);
    localStorage.setItem('kofy_avatar', currentAvatarUrl);

    cerrarModal();
}

// --- LÓGICA DE POSTS CON SCROLL INFINITO ---
let cargaInicialCompletada = false;
let ultimoPostFecha = null;
let cargandoMas = false;

// 1. Escuchar solo los posts NUEVOS que se crean mientras la app está abierta
database.ref('posts/').limitToLast(1).on('child_added', (snapshot) => {
    if (!cargaInicialCompletada) return; // Evitar duplicados en la carga inicial
    
    const datos = snapshot.val();
    const idS = snapshot.key;
    const feed = document.getElementById('feed-container');

    if (feed) {
        const postDiv = crearElementoPost(idS, datos);
        feed.prepend(postDiv); // Los nuevos van arriba
        mostrarNotificacion(datos.usuario, datos.mensaje);
    }
});

// 2. Función para cargar bloques de posts (Paginación)
function cargarMasPosts() {
    if (cargandoMas) return;
    cargandoMas = true;

    let consulta = database.ref('posts/').orderByChild('fecha');
    
    // Si ya cargamos algo, pedimos los que siguen hacia atrás en el tiempo
    if (ultimoPostFecha) {
        consulta = consulta.endAt(ultimoPostFecha - 1);
    }

    consulta.limitToLast(6).once('value', (snapshot) => {
        const posts = [];
        snapshot.forEach(child => {
            posts.push({ id: child.key, ...child.val() });
        });

        if (posts.length > 0) {
            posts.reverse(); // Ordenar del más nuevo al más viejo dentro del bloque
            ultimoPostFecha = posts[posts.length - 1].fecha;
            
            const feed = document.getElementById('feed-container');
            posts.forEach(p => {
                const postDiv = crearElementoPost(p.id, p);
                feed.appendChild(postDiv); // Los viejos van abajo
            });
        }
        cargandoMas = false;
        cargaInicialCompletada = true;
    });
}

// Función auxiliar para no repetir código de creación de HTML
function crearElementoPost(id, datos) {
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
        <div class="actions" style="display: flex; align-items: center; width: 100%; margin-top: 10px;">
            <span onclick="enviarLike('${id}')" style="cursor:pointer">❤️ <span id="likes-${id}">${datos.likes || 0}</span> Me gusta</span>
            <button class="btn-report" onclick="reportarPost('${id}', '${datos.usuario}', '${datos.mensaje}')">Reportar 🚩</button>
        </div>
    `;
    return postDiv;
}

// --- DETECTAR SCROLL ---
const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting) {
        cargarMasPosts();
    }
}, { threshold: 0.1 });

// --- LÓGICA DE PUBLICACIÓN ---
function publicar() {
    const nombre = document.getElementById('nombrePerfil').textContent;
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
                // --- PROCESO DE COMPRESIÓN ---
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                // Definimos un tamaño máximo (por ejemplo, 800px)
                const maxAncho = 800;
                const escala = maxAncho / img.width;
                canvas.width = maxAncho;
                canvas.height = img.height * escala;

                // Dibujamos la imagen reducida en el canvas
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                // Convertimos a Base64 pero con calidad baja (0.6 = 60%)
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
    database.ref('posts/').push({
        usuario: usuario,
        mensaje: mensaje,
        imagen: imagenData,
        avatar: currentAvatarUrl,
        fecha: Date.now(),
        likes: 0
    });
    document.getElementById('postText').value = "";
    if (document.getElementById('postImage')) document.getElementById('postImage').value = "";
}

// --- LIKES, BORRADO Y REPORTES (Tus funciones originales) ---
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

// --- CARGA INICIAL ---
document.addEventListener('DOMContentLoaded', () => {
    const n = localStorage.getItem('kofy_nombre');
    const b = localStorage.getItem('kofy_bio');
    const a = localStorage.getItem('kofy_avatar');

    if (n) {
        document.getElementById('nav-username').textContent = n;
        document.getElementById('nombrePerfil').textContent = n;
        database.ref(`seguidores/${n}`).on('value', (s) => {
            const c = document.getElementById('misSeguidoresCount');
            if (c) c.textContent = `${s.numChildren()} seguidores`;
        });
    }
    if (b) document.getElementById('bioPerfil').textContent = b;
    if (a) {
        currentAvatarUrl = a;
        document.getElementById('imgNav').src = a;
        document.getElementById('imgPerfil').src = a;
    }

    // Iniciar el observador para el Infinite Scroll
    const sentinel = document.getElementById('sentinel');
    if (sentinel) observer.observe(sentinel);
    
    // Cargar los primeros posts
    cargarMasPosts();
});

