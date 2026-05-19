// --- LÓGICA DE PERFIL Y CONFIGURACIÓN ---
let currentAvatarUrl = localStorage.getItem('kofy_avatar') || "https://i.pravatar.cc/150?u=kofy";

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

// --- LÓGICA DE POSTS (FIREBASE) ---

function publicar() {
    const nombre = document.getElementById('nombrePerfil').textContent;
    const texto = document.getElementById('postText').value;

    // VERIFICACIÓN DE BANEO
    database.ref(`baneados/${nombre}`).once('value', (snapshot) => {
        if (snapshot.exists()) {
            alert("Tu cuenta ha sido suspendida por incumplir las normas. 🚫");
            return; // Detiene la publicación
        }

        // Si no está baneado, procede con el post (tu código actual)
        if (!texto) return alert("¡Escribe algo lindo! 🌸");

        database.ref('posts/').push({
            usuario: nombre,
            mensaje: texto,
            avatar: currentAvatarUrl,
            biografia: document.getElementById('bioPerfil').textContent,
            likes: 0,
            fecha: Date.now()
        });
        document.getElementById('postText').value = "";
    });
}

function borrarPost(idMensaje) {
    if (confirm("¿Seguro que quieres borrar este momento koi? 🗑️")) {
        database.ref('posts/' + idMensaje).remove();
    }
}

function enviarLike(idPost) {
    // 1. Obtener la lista de mis likes del almacenamiento
    let misLikes = JSON.parse(localStorage.getItem('kofy_mis_likes')) || [];
    const yaDiLike = misLikes.includes(idPost);

    const postRef = database.ref('posts/' + idPost + '/likes');

    if (yaDiLike) {
        // QUITAR LIKE: Restamos 1 en Firebase y lo sacamos de mi lista
        postRef.transaction((currentLikes) => (currentLikes || 1) - 1);
        misLikes = misLikes.filter(id => id !== idPost);
    } else {
        // DAR LIKE: Sumamos 1 en Firebase y lo agregamos a mi lista
        postRef.transaction((currentLikes) => (currentLikes || 0) + 1);
        misLikes.push(idPost);
    }

    // 2. Guardar mi nueva lista en la "mochila"
    localStorage.setItem('kofy_mis_likes', JSON.stringify(misLikes));
    
    // 3. Opcional: Cambiar el color del corazón inmediatamente (visual)
    actualizarEstadoCorazon(idPost, !yaDiLike);
}

// Función extra para que el corazón se vea rojo si ya le diste like
function actualizarEstadoCorazon(idPost, activo) {
    const btnLike = document.querySelector(`.kofy-post[data-id="${idPost}"] .actions span`);
    if (btnLike) {
        btnLike.style.color = activo ? "#ff4d4d" : "var(--morado-deep)";
        btnLike.style.fontWeight = activo ? "bold" : "normal";
    }
}

// --- VER PERFIL DE OTROS ---
function verPerfil(nombre, avatar, bio) {
    const modal = document.getElementById('modalVistaPerfil');
    const miNombre = localStorage.getItem('kofy_nombre') || "@KofyUser";

    if (modal) {
        document.getElementById('vistaNombre').textContent = nombre;
        document.getElementById('vistaImg').src = avatar;
        document.getElementById('vistaBio').textContent = bio || "Sin biografía aún. ✨";
        
        // 1. Verificar si ya lo sigo para el botón
        database.ref(`seguidores/${nombre}/${miNombre}`).once('value', (snapshot) => {
            actualizarBotonSeguir(snapshot.exists());
        });

        // 2. CONTADOR EN TIEMPO REAL: Esta es la parte que faltaba conectar
        database.ref(`seguidores/${nombre}`).on('value', (snapshot) => {
            const total = snapshot.numChildren(); // Cuenta cuántos seguidores hay
            const contadorHTML = document.getElementById('countSeguidores');
            if (contadorHTML) {
                contadorHTML.textContent = `${total} ${total === 1 ? 'seguidor' : 'seguidores'} 🌸`;
            }
        });

        modal.style.display = 'flex';
    }
}

function cerrarVista() {
    document.getElementById('modalVistaPerfil').style.display = 'none';
}

// --- ESCUCHADORES DE FIREBASE (TIEMPO REAL) ---

// 1. Cuando se agrega un post
database.ref('posts/').on('child_added', (snapshot) => {
    const datos = snapshot.val();
    const idS = snapshot.key;
    const feed = document.getElementById('feed-container');

    if (feed) {
        // Quitamos el mensaje de carga si existe
        if (feed.innerText.includes("Un momento")) feed.innerText = "";

        const postDiv = document.createElement('div');
        postDiv.className = 'card kofy-post';
        postDiv.dataset.id = idS; // Importante para el borrado instantáneo
        
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
    }
});

// 2. Cuando alguien borra un post (se borra para todos)
database.ref('posts/').on('child_removed', (snapshot) => {
    const idEliminado = snapshot.key;
    const post = document.querySelector(`.kofy-post[data-id="${idEliminado}"]`);
    if (post) post.remove();
});

// 3. Cuando alguien da like (se actualiza para todos)
database.ref('posts/').on('child_changed', (snapshot) => {
    const datos = snapshot.val();
    const idPost = snapshot.key;
    const likeCounter = document.getElementById(`likes-${idPost}`);
    if (likeCounter) {
        likeCounter.innerText = datos.likes || 0;
    }
});

// --- CHAT GENERAL ---
window.enviarMensaje = function() {
    const input = document.getElementById('chat-input');
    const nombre = document.getElementById('nombrePerfil').textContent;
    
    if (input && input.value.trim() !== "") {
        database.ref('chat_general/').push({
            usuario: nombre,
            mensaje: input.value,
            fecha: Date.now() // <--- ESTO ES LO QUE GUARDA LA HORA
        });
        input.value = "";
    }
};

database.ref('chat_general/').on('child_added', (snapshot) => {
    const datos = snapshot.val();
    const container = document.getElementById('chat-messages-container');
    const miNombre = document.getElementById('nombrePerfil').textContent;

    if (container) {
        // Convertimos el número de Firebase en hora real
        const fechaMsg = new Date(datos.fecha);
        const hora = fechaMsg.getHours().toString().padStart(2, '0');
        const min = fechaMsg.getMinutes().toString().padStart(2, '0');
        const dia = fechaMsg.getDate().toString().padStart(2, '0');
        const mes = (fechaMsg.getMonth() + 1).toString().padStart(2, '0');

        const nuevaBurbuja = document.createElement('div');
        nuevaBurbuja.className = (datos.usuario === miNombre) ? 'bubble mine' : 'bubble';
        
        // El HTML con el nombre arriba y la hora abajo
        nuevaBurbuja.innerHTML = `
            <small style="display:block; font-size:10px; font-weight:bold; margin-bottom:2px;">${datos.usuario}</small>
            <div style="word-break: break-word;">${datos.mensaje}</div>
            <small style="display:block; font-size:9px; opacity:0.6; text-align:right; margin-top:4px;">
                ${dia}/${mes} ${hora}:${min}
            </small>
        `;
        
        container.appendChild(nuevaBurbuja);
        container.scrollTop = container.scrollHeight;
    }
});

// --- RECUPERAR DATOS AL REFRESCAR (PARA TODAS LAS PÁGINAS) ---
document.addEventListener('DOMContentLoaded', () => {
    const nombreGuardado = localStorage.getItem('kofy_nombre');
    const bioGuardada = localStorage.getItem('kofy_bio');
    const avatarGuardado = localStorage.getItem('kofy_avatar');

    // --- NUEVO: Cargar mi propio contador de seguidores ---
    if (nombreGuardado) {
        database.ref(`seguidores/${nombreGuardado}`).on('value', (snapshot) => {
            const total = snapshot.numChildren();
            const miContador = document.getElementById('misSeguidoresCount');
            if (miContador) {
                miContador.textContent = `${total} ${total === 1 ? 'seguidor' : 'seguidores'} 🌸`;
    }
  });
}

    // Actualiza el nombre en el Menú Superior (Index y Perfil)
    if (nombreGuardado) {
        const navUser = document.getElementById('nav-username');
        if(navUser) navUser.textContent = nombreGuardado;
        
        const perfilNombre = document.getElementById('nombrePerfil');
        if(perfilNombre) perfilNombre.textContent = nombreGuardado;
    }

    // Actualiza la Bio (solo si existe el elemento en la página actual)
    if (bioGuardada) {
        const perfilBio = document.getElementById('bioPerfil');
        if(perfilBio) perfilBio.textContent = bioGuardada;
    }

    // Actualiza la Foto en todos los lugares
    if (avatarGuardado) {
        currentAvatarUrl = avatarGuardado;
        
        // Foto del Menú Superior
        const imgNav = document.getElementById('imgNav');
        if(imgNav) imgNav.src = avatarGuardado;
        
        // Foto Grande del Perfil
        const imgPerfil = document.getElementById('imgPerfil');
        if(imgPerfil) imgPerfil.src = avatarGuardado;
    }
});

// --- LÓGICA DE SEGUIDORES ---

function seguirUsuario(nombreSeguido) {
    const miNombre = localStorage.getItem('kofy_nombre') || "@KofyUser";
    
    if (miNombre === nombreSeguido) return alert("¡No puedes seguirte a ti mismo! 🌸");

    const seguidoresRef = database.ref(`seguidores/${nombreSeguido}/${miNombre}`);

    seguidoresRef.get().then((snapshot) => {
        if (snapshot.exists()) {
            // Si ya lo sigue, lo deja de seguir (unfollow)
            seguidoresRef.remove();
            actualizarBotonSeguir(false);
        } else {
            // Si no lo sigue, lo agrega
            seguidoresRef.set(true);
            actualizarBotonSeguir(true);
        }
    });
}

function actualizarBotonSeguir(siguiendo) {
    const btn = document.getElementById('btnSeguir');
    if (btn) {
        btn.textContent = siguiendo ? "Siguiendo ✨" : "Seguir 🌸";
        btn.style.background = siguiendo ? "var(--lavanda)" : "var(--morado-deep)";
    }
}

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
