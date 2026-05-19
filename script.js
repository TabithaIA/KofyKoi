// --- LÓGICA DE PERFIL Y CONFIGURACIÓN ---
let currentAvatarUrl = localStorage.getItem('kofy_avatar') || "https://i.pravatar.cc/150?u=kofy";

// Solicitar permiso para notificaciones del sistema
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
    if(modal) {
        modal.style.display = 'flex';
        document.getElementById('editNombre').value = document.getElementById('nombrePerfil').textContent;
        document.getElementById('editBio').value = document.getElementById('bioPerfil').textContent;
        document.getElementById('previewPerfil').src = currentAvatarUrl;
    }
}

function cerrarModal() {
    const modal = document.getElementById('modalPerfil');
    if(modal) modal.style.display = 'none';
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

// --- LÓGICA DE POSTS Y FEED ---
let cargaInicialCompletada = false;

// 1. Cuando se agrega un post
database.ref('posts/').on('child_added', (snapshot) => {
    const datos = snapshot.val();
    const idS = snapshot.key;
    const feed = document.getElementById('feed-container');

    if (feed) {
        if (feed.innerText.includes("Un momento")) feed.innerText = "";

        const postDiv = document.createElement('div');
        postDiv.className = 'card kofy-post';
        postDiv.dataset.id = idS; 
        
        postDiv.innerHTML = `
            <div class="post-header" style="display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <img src="${datos.avatar || 'https://i.pravatar.cc/150?u=default'}" class="avatar-sm">
                    <strong onclick="verPerfil('${datos.usuario}', '${datos.avatar}', '${datos.biografia || ''}')" style="cursor:pointer; color:var(--morado-deep)">
                        ${datos.usuario}
                    </strong>
                </div>
                <button onclick="borrarPost('${idS}')" style="background:none; border:none; cursor:pointer;">🗑️</button>
            </div>
            <p>${datos.mensaje}</p>
            <div class="actions" style="display: flex; align-items: center; width: 100%;">
                <span onclick="enviarLike('${idS}')" style="cursor:pointer">❤️ <span id="likes-${idS}">${datos.likes || 0}</span> Me gusta</span>
                <button class="btn-report" onclick="reportarPost('${idS}', '${datos.usuario}', '${datos.mensaje}')">
                    Reportar 🚩
                </button>
            </div>
        `;
        feed.prepend(postDiv);

        // Llamar a la notificación si el mensaje es nuevo
        if (cargaInicialCompletada) {
            mostrarNotificacion(datos.usuario, datos.mensaje);
        }
    }
});

setTimeout(() => { cargaInicialCompletada = true; }, 2000);

function publicar() {
    const nombre = document.getElementById('nombrePerfil').textContent;
    const texto = document.getElementById('postText').value;
    const inputImagen = document.getElementById('postImage');
    const archivo = inputImagen.files[0];

    // Si hay una foto, primero la convertimos a texto (Base64)
    if (archivo) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const dataUrl = e.target.result; // La foto convertida en texto
            enviarPost(nombre, texto, dataUrl);
        };
        reader.readAsDataURL(archivo);
    } else {
        enviarPost(nombre, texto, ""); // Publicar sin foto
    }
}

function enviarPost(usuario, mensaje, imagenTexto) {
    database.ref('posts/').push({
        usuario: usuario,
        mensaje: mensaje,
        imagen: imagenTexto, // <--- Aquí se guarda la foto para que todos la vean
        avatar: currentAvatarUrl,
        fecha: Date.now(),
        likes: 0
    });
    
    // Limpiar campos
    document.getElementById('postText').value = "";
    document.getElementById('postImage').value = "";
}

// --- FUNCIÓN DE LIKE CORREGIDA (PONER Y QUITAR) ---
function enviarLike(idPost) {
    const yaDioLike = localStorage.getItem(`like_${idPost}`);
    const likesRef = database.ref(`posts/${idPost}/likes`);

    if (yaDioLike) {
        // Si ya tiene like, restamos uno
        likesRef.transaction((currentLikes) => {
            return (currentLikes || 1) - 1;
        }).then(() => {
            localStorage.removeItem(`like_${idPost}`);
        });
    } else {
        // Si no tiene like, sumamos uno
        likesRef.transaction((currentLikes) => {
            return (currentLikes || 0) + 1;
        }).then(() => {
            localStorage.setItem(`like_${idPost}`, true);
        });
    }
}

database.ref('posts/').on('child_changed', (snapshot) => {
    const idS = snapshot.key;
    const nuevosDatos = snapshot.val();
    const likesSpan = document.getElementById(`likes-${idS}`);
    if (likesSpan) likesSpan.innerText = nuevosDatos.likes || 0;
});

function borrarPost(id) {
    if (confirm("¿Seguro que quieres borrar este recuerdo? 🌸")) {
        database.ref(`posts/${id}`).remove();
    }
}

database.ref('posts/').on('child_removed', (snapshot) => {
    const idS = snapshot.key;
    const postAEliminar = document.querySelector(`[data-id="${idS}"]`);
    if (postAEliminar) postAEliminar.remove();
});

// --- VISTA DE PERFIL (MODAL) ---
function verPerfil(nombre, avatar, bio) {
    const modal = document.getElementById('modalVistaPerfil');
    const miNombre = localStorage.getItem('kofy_nombre') || "@KofyUser";
    const btnSeguir = document.getElementById('btnSeguir');
    const contadorHTML = document.getElementById('countSeguidores');

    if (modal) {
        document.getElementById('vistaNombre').textContent = nombre;
        document.getElementById('vistaImg').src = avatar || 'https://i.pravatar.cc/150?u=default';
        document.getElementById('vistaBio').textContent = bio || "Sin biografía aún. ✨";
        
        if (nombre === miNombre) {
            if (btnSeguir) btnSeguir.style.display = "none";
        } else {
            if (btnSeguir) {
                btnSeguir.style.display = "block";
                database.ref(`seguidores/${nombre}/${miNombre}`).once('value', (snapshot) => {
                    actualizarBotonSeguir(snapshot.exists());
                });
            }
        }

        database.ref(`seguidores/${nombre}`).on('value', (snapshot) => {
            const total = snapshot.numChildren();
            if (contadorHTML) contadorHTML.textContent = `${total} seguidores 🌸`;
        });

        modal.style.display = 'flex';
    }
}

function cerrarVista() {
    const modal = document.getElementById('modalVistaPerfil');
    if(modal) modal.style.display = 'none';
}

// --- REPORTES ---
function reportarPost(idPost, usuarioReportado, mensaje) {
    const miNombre = localStorage.getItem('kofy_nombre') || "@KofyUser";
    if (confirm(`¿Quieres reportar este mensaje de ${usuarioReportado}? 🚩`)) {
        database.ref('reportes/').push({
            reportado_por: miNombre,
            usuario_infractor: usuarioReportado,
            mensaje_reportado: mensaje,
            id_del_post: idPost,
            fecha: Date.now()
        }).then(() => {
            alert("Gracias por ayudar a cuidar KofyKoi. Revisaremos el reporte pronto. 🌸");
        });
    }
}

// --- NOTIFICACIONES ---
function mostrarNotificacion(usuario, mensaje) {
    const miNombre = localStorage.getItem('kofy_nombre') || "@KofyUser";
    if (usuario === miNombre) return;

    const toast = document.createElement('div');
    toast.className = 'notification-toast';
    toast.innerHTML = `<strong>${usuario}:</strong> ${mensaje.substring(0, 25)}...`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);

    if (Notification.permission === 'granted') {
        navigator.serviceWorker.ready.then(registration => {
            registration.showNotification(`KofyKoi: ${usuario}`, {
                body: mensaje,
                icon: 'https://i.pravatar.cc/150?u=kofy',
                vibrate: [200, 100, 200]
            });
        });
    }
}

// --- SEGUIDORES ---
function seguirUsuario(nombreSeguido) {
    const miNombre = localStorage.getItem('kofy_nombre') || "@KofyUser";
    if (miNombre === nombreSeguido) return alert("¡No puedes seguirte a ti mismo! 🌸");

    const seguidoresRef = database.ref(`seguidores/${nombreSeguido}/${miNombre}`);
    seguidoresRef.get().then((snapshot) => {
        if (snapshot.exists()) {
            seguidoresRef.remove();
            actualizarBotonSeguir(false);
        } else {
            seguidoresRef.set(true);
            actualizarBotonSeguir(true);
        }
    });
}

function actualizarBotonSeguir(siguiendo) {
    const btn = document.getElementById('btnSeguir');
    if (btn) btn.textContent = siguiendo ? "Siguiendo ✨" : "Seguir 🌸";
}

// --- RECUPERAR DATOS AL CARGAR ---
document.addEventListener('DOMContentLoaded', () => {
    const nombreGuardado = localStorage.getItem('kofy_nombre');
    const bioGuardada = localStorage.getItem('kofy_bio');
    const avatarGuardado = localStorage.getItem('kofy_avatar');

    if (nombreGuardado) {
        const navUser = document.getElementById('nav-username');
        if(navUser) navUser.textContent = nombreGuardado;
        const perfilNombre = document.getElementById('nombrePerfil');
        if(perfilNombre) perfilNombre.textContent = nombreGuardado;

        database.ref(`seguidores/${nombreGuardado}`).on('value', (snapshot) => {
            const total = snapshot.numChildren();
            const countLabel = document.getElementById('misSeguidoresCount');
            if (countLabel) countLabel.textContent = `${total} seguidores`;
        });
    }

    if (bioGuardada) {
        const perfilBio = document.getElementById('bioPerfil');
        if(perfilBio) perfilBio.textContent = bioGuardada;
    }

    if (avatarGuardado) {
        currentAvatarUrl = avatarGuardado;
        const imgNav = document.getElementById('imgNav');
        if(imgNav) imgNav.src = avatarGuardado;
        const imgPerfil = document.getElementById('imgPerfil');
        if(imgPerfil) imgPerfil.src = avatarGuardado;
    }
});

