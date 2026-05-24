// --- VARIABLES GLOBALES Y ESTADO ---
let currentAvatarUrl = localStorage.getItem('kofy_avatar') || "https://i.pravatar.cc/150?u=kofy";
let cargaInicialCompletada = false;
let ultimoPostFecha = null;
let cargandoMas = false;
let cropper; // Variable para la instancia de Cropper

// --- CONFIGURACIÓN DE NOTIFICACIONES ---
if ('Notification' in window && 'serviceWorker' in navigator) {
    Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
            console.log("¡Permiso de notificaciones concedido! 🌸");
            navigator.serviceWorker.register('sw.js');
        }
    });
}

// --- LÓGICA DE PERFIL Y CROPPER ---
function previewImagen(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const imgEl = document.getElementById('imagen-a-recortar');
            const previewPerfil = document.getElementById('previewPerfil');
            const contenedorRecorte = document.getElementById('contenedor-recorte');
            
            previewPerfil.style.display = 'none';
            contenedorRecorte.style.display = 'block';
            
            imgEl.src = e.target.result;
            
            // Inicializar Cropper
            if (cropper) cropper.destroy();
            cropper = new Cropper(imgEl, {
                aspectRatio: 1,
                viewMode: 1,
                dragMode: 'move',
                autoCropArea: 1,
                restore: false,
                guides: true,
                center: true,
                highlight: false,
                cropBoxMovable: true,
                cropBoxResizable: true,
                toggleDragModeOnDblclick: false,
            });
        };
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
        document.getElementById('previewPerfil').style.display = 'block';
        document.getElementById('contenedor-recorte').style.display = 'none';
    }
}

function cerrarModal() {
    const modal = document.getElementById('modalPerfil');
    if (modal) {
        if (cropper) {
            cropper.destroy();
            cropper = null;
        }
        modal.style.display = 'none';
    }
}

function guardarPerfil() {
    if (cropper) {
        currentAvatarUrl = cropper.getCroppedCanvas({
            width: 150,
            height: 150
        }).toDataURL('image/jpeg');
        
        cropper.destroy();
        cropper = null;
        document.getElementById('contenedor-recorte').style.display = 'none';
        document.getElementById('previewPerfil').style.display = 'block';
    }

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

// --- LÓGICA DE POSTS (FEED) ---
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

function cargarMasPosts() {
    if (cargandoMas) return;
    cargandoMas = true;
    let consulta = database.ref('posts/').orderByChild('fecha');
    if (ultimoPostFecha) consulta = consulta.endAt(ultimoPostFecha - 1);

    consulta.limitToLast(6).once('value', (snapshot) => {
        const feed = document.getElementById('feed-container');
        const posts = [];
        snapshot.forEach(child => {
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
            ultimoPostFecha = posts[posts.length - 1].fecha;
        }
        cargandoMas = false;
        cargaInicialCompletada = true;
    });
}

function crearElementoPost(id, datos) {
    const fecha = new Date(datos.fecha);
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

const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && !cargandoMas) {
        cargarMasPosts();
    }
}, { threshold: 0.5, rootMargin: "100px" });

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

