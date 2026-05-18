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
    const texto = document.getElementById('postText').value;
    const nombre = document.getElementById('nombrePerfil').textContent;
    const bio = document.getElementById('bioPerfil').textContent; // Capturamos la bio actual

    if (!texto) return alert("¡Escribe algo lindo! 🌸");

    database.ref('posts/').push({
        usuario: nombre,
        mensaje: texto,
        avatar: currentAvatarUrl,
        biografia: bio, // Guardamos la bio en el post
        likes: 0,
        fecha: Date.now()
    });

    document.getElementById('postText').value = "";
}

function borrarPost(idMensaje) {
    if (confirm("¿Seguro que quieres borrar este momento koi? 🗑️")) {
        database.ref('posts/' + idMensaje).remove();
    }
}

function enviarLike(idPost) {
    const postRef = database.ref('posts/' + idPost + '/likes');
    postRef.transaction((currentLikes) => {
        return (currentLikes || 0) + 1;
    });
}

// --- VER PERFIL DE OTROS ---
function verPerfil(nombre, avatar, bio) {
    const modal = document.getElementById('modalVistaPerfil');
    if (modal) {
        document.getElementById('vistaNombre').textContent = nombre;
        document.getElementById('vistaImg').src = avatar;
        document.getElementById('vistaBio').textContent = bio || "Sin biografía aún. ✨";
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
            <div class="actions">
                <span onclick="enviarLike('${idS}')" style="cursor:pointer">❤️ <span id="likes-${idS}">${datos.likes || 0}</span> Me gusta</span>
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
            fecha: Date.now()
        });
        input.value = "";
    }
};

database.ref('chat_general/').on('child_added', (snapshot) => {
    const datos = snapshot.val();
    const container = document.getElementById('chat-messages-container');
    const miNombre = document.getElementById('nombrePerfil').textContent;

    if (container) {
        const nuevaBurbuja = document.createElement('div');
        nuevaBurbuja.className = (datos.usuario === miNombre) ? 'bubble mine' : 'bubble';
        nuevaBurbuja.innerHTML = `<small style="display:block; font-size:10px; opacity:0.7;">${datos.usuario}</small>${datos.mensaje}`;
        container.appendChild(nuevaBurbuja);
        container.scrollTop = container.scrollHeight;
    }
});

// --- RECUPERAR DATOS AL REFRESCAR (PARA TODAS LAS PÁGINAS) ---
document.addEventListener('DOMContentLoaded', () => {
    const nombreGuardado = localStorage.getItem('kofy_nombre');
    const bioGuardada = localStorage.getItem('kofy_bio');
    const avatarGuardado = localStorage.getItem('kofy_avatar');

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
