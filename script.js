/**
 * Gestor de Productos
 * Permite agregar, mostrar y eliminar productos dinámicamente.
 * Los productos persisten en localStorage al recargar la página.
 */

"use strict";

// Referencias al DOM 
const form              = document.getElementById("productForm");
const inputNombre       = document.getElementById("nombre");
const inputDescripcion  = document.getElementById("descripcion");
const inputImagen       = document.getElementById("imagen");
const preview           = document.getElementById("preview");
const uploadPlaceholder = document.getElementById("uploadPlaceholder");
const uploadArea        = document.getElementById("uploadArea");
const charCount         = document.getElementById("charCount");
const btnLimpiar        = document.getElementById("btnLimpiar");
const productContainer  = document.getElementById("productContainer");
const emptyState        = document.getElementById("emptyState");
const productCountBadge = document.getElementById("productCount");
const toast             = document.getElementById("toast");

const errorNombre      = document.getElementById("errorNombre");
const errorDescripcion = document.getElementById("errorDescripcion");
const errorImagen      = document.getElementById("errorImagen");

// Clave de almacenamiento 
const STORAGE_KEY = "gestor_productos";

// Estado de la app 
let productos    = cargarDesdeStorage(); // Carga desde localStorage al inicio
let imagenBase64 = null;
let toastTimer   = null;

// Persistencia 

//Guarda el array de productos en localStorage.

function guardarEnStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(productos));
  } catch (e) {
    // Si la imagen es muy grande y supera la cuota, avisamos
    console.warn("No se pudo guardar en localStorage:", e);
    mostrarToast("Advertencia: imagen demasiado grande para guardar localmente.", "error");
  }
}

/**
 * Carga y devuelve el array de productos desde localStorage.
 * @returns {Array}
 */
function cargarDesdeStorage() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

// Utilidades 

function generarId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function mostrarToast(mensaje, tipo = "") {
  if (toastTimer) clearTimeout(toastTimer);
  toast.textContent = mensaje;
  toast.className   = "toast " + tipo;
  void toast.offsetWidth;
  toast.classList.add("show");
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
}

function limpiarErrores() {
  errorNombre.textContent      = "";
  errorDescripcion.textContent = "";
  errorImagen.textContent      = "";
  inputNombre.classList.remove("input-error");
  inputDescripcion.classList.remove("input-error");
}

function validarFormulario() {
  let valido = true;
  limpiarErrores();

  const nombre      = inputNombre.value.trim();
  const descripcion = inputDescripcion.value.trim();

  if (!nombre) {
    errorNombre.textContent = "El nombre del producto es obligatorio.";
    inputNombre.classList.add("input-error");
    valido = false;
  } else if (nombre.length < 2) {
    errorNombre.textContent = "El nombre debe tener al menos 2 caracteres.";
    inputNombre.classList.add("input-error");
    valido = false;
  }

  if (!descripcion) {
    errorDescripcion.textContent = "La descripción es obligatoria.";
    inputDescripcion.classList.add("input-error");
    valido = false;
  } else if (descripcion.length < 5) {
    errorDescripcion.textContent = "La descripción debe tener al menos 5 caracteres.";
    inputDescripcion.classList.add("input-error");
    valido = false;
  }

  return valido;
}

//Contador de caracteres 
inputDescripcion.addEventListener("input", () => {
  const len = inputDescripcion.value.length;
  charCount.textContent  = `${len} / 300`;
  charCount.style.color  = len >= 280 ? "var(--danger)" : "";
});

// Manejo de imagen 
function procesarImagen(file) {
  errorImagen.textContent = "";

  if (!file.type.startsWith("image/")) {
    errorImagen.textContent = "El archivo debe ser una imagen (JPG, PNG, WEBP, GIF).";
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    errorImagen.textContent = "La imagen no debe superar los 5 MB.";
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    imagenBase64 = e.target.result;
    preview.src  = imagenBase64;
    preview.classList.add("visible");
    uploadPlaceholder.style.display = "none";
  };
  reader.onerror = () => {
    errorImagen.textContent = "Error al leer la imagen.";
  };
  reader.readAsDataURL(file);
}

inputImagen.addEventListener("change", (e) => {
  if (e.target.files[0]) procesarImagen(e.target.files[0]);
});

uploadArea.addEventListener("dragover",  (e) => { e.preventDefault(); uploadArea.classList.add("drag-over"); });
uploadArea.addEventListener("dragleave", ()  => uploadArea.classList.remove("drag-over"));
uploadArea.addEventListener("drop", (e) => {
  e.preventDefault();
  uploadArea.classList.remove("drag-over");
  if (e.dataTransfer.files[0]) procesarImagen(e.dataTransfer.files[0]);
});

// Renderizado de tarjetas 
function escapeHtml(str) {
  const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return String(str).replace(/[&<>"']/g, (c) => map[c]);
}

function crearTarjeta(producto) {
  const card = document.createElement("article");
  card.className  = "product-card";
  card.dataset.id = producto.id;

  const imagenHTML = producto.imagen
    ? `<img class="card-image" src="${producto.imagen}" alt="${escapeHtml(producto.nombre)}" />`
    : `<div class="card-image-placeholder" aria-hidden="true">🖼️</div>`;

  card.innerHTML = `
    ${imagenHTML}
    <div class="card-body">
      <p class="card-name">${escapeHtml(producto.nombre)}</p>
      <p class="card-desc">${escapeHtml(producto.descripcion)}</p>
    </div>
    <div class="card-footer">
      <button class="btn-delete" aria-label="Eliminar ${escapeHtml(producto.nombre)}">
        🗑 Eliminar
      </button>
    </div>
  `;

  card.querySelector(".btn-delete").addEventListener("click", () => {
    eliminarProducto(producto.id, card);
  });

  return card;
}

function actualizarUI() {
  const total = productos.length;
  productCountBadge.textContent = total === 1 ? "1 producto" : `${total} productos`;
  emptyState.classList.toggle("hidden", total > 0);
  productContainer.classList.toggle("hidden", total === 0);
}

// Agregar producto 
form.addEventListener("submit", (e) => {
  e.preventDefault();

  if (!validarFormulario()) {
    mostrarToast("Corrige los errores antes de continuar.", "error");
    return;
  }

  const nuevoProducto = {
    id:          generarId(),
    nombre:      inputNombre.value.trim(),
    descripcion: inputDescripcion.value.trim(),
    imagen:      imagenBase64,
  };

  productos.push(nuevoProducto);
  guardarEnStorage();                          // ← Persiste

  const tarjeta = crearTarjeta(nuevoProducto);
  productContainer.prepend(tarjeta);

  actualizarUI();
  mostrarToast(`"${nuevoProducto.nombre}" agregado correctamente.`, "success");
  resetearFormulario();
});

// Eliminar producto 
function eliminarProducto(id, cardEl) {
  productos = productos.filter((p) => p.id !== id);
  guardarEnStorage();                          // ← Persiste

  cardEl.style.transition = "opacity .2s ease, transform .2s ease";
  cardEl.style.opacity    = "0";
  cardEl.style.transform  = "scale(.9)";
  setTimeout(() => { cardEl.remove(); actualizarUI(); }, 200);

  mostrarToast("Producto eliminado.", "");
}

// Limpiar formulario 
function resetearFormulario() {
  form.reset();
  limpiarErrores();
  imagenBase64 = null;
  preview.src  = "";
  preview.classList.remove("visible");
  uploadPlaceholder.style.display = "";
  charCount.textContent = "0 / 300";
  charCount.style.color = "";
}

btnLimpiar.addEventListener("click", () => {
  resetearFormulario();
  mostrarToast("Formulario limpiado.", "");
});

//Init: cargar productos guardados 
(function inicializar() {
  // Renderiza los productos almacenados, preservando el orden (más reciente primero)
  [...productos].reverse().forEach((p) => {
    productContainer.prepend(crearTarjeta(p));
  });
  actualizarUI();
})();
