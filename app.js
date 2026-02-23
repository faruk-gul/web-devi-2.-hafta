// ======= Storage =======
const STORAGE_KEY = "beusharebox_products_v2";

function loadProducts() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
function saveProducts(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

// ======= Helpers =======
function cryptoRandomId() {
  if (window.crypto && crypto.getRandomValues) {
    const arr = new Uint32Array(2);
    crypto.getRandomValues(arr);
    return `${arr[0].toString(16)}${arr[1].toString(16)}`;
  }
  return `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function escapeAttr(str) {
  return escapeHtml(str);
}

function isValidUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function formatTRY(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return "₺0";
  return num.toLocaleString("tr-TR", { style: "currency", currency: "TRY" });
}

// Foto: URL varsa URL, yoksa file varsa Base64
function getImageData() {
  return new Promise((resolve) => {
    const fileInput = document.getElementById("imageFile");
    const url = document.getElementById("imageUrl").value.trim();

    if (url && isValidUrl(url)) {
      resolve(url);
      return;
    }

    if (fileInput.files && fileInput.files.length > 0) {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(fileInput.files[0]);
      return;
    }

    resolve("");
  });
}

function normalizeComments(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((c) => {
    if (typeof c === "string") return c;
    if (c && typeof c === "object") return c.text ? String(c.text) : JSON.stringify(c);
    return String(c);
  });
}

function safeString(val) {
  return typeof val === "string" ? val : "";
}

// ======= State =======
let products = loadProducts();
let activeCategory = "Tümü";
let searchText = "";

// ======= UI refs =======
const productsGrid = document.getElementById("productsGrid");
const categoryChips = document.getElementById("categoryChips");
const searchInput = document.getElementById("searchInput");
const addForm = document.getElementById("addForm");
const clearAllBtn = document.getElementById("clearAllBtn");

// ======= Categories =======
const CATEGORIES = ["Tümü", "Elektronik", "Kitap", "Giyim", "Aksesuar", "Diğer"];

function renderCategoryChips() {
  categoryChips.innerHTML = CATEGORIES.map((c) => {
    const active = c === activeCategory ? "active" : "";
    return `<button class="chip ${active}" data-cat="${escapeAttr(c)}">${escapeHtml(c)}</button>`;
  }).join("");

  categoryChips.querySelectorAll(".chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeCategory = btn.dataset.cat;
      renderAll();
    });
  });
}

// ======= Filtering =======
function getFilteredProducts() {
  const s = searchText.trim().toLowerCase();

  return products.filter((p) => {
    const catOk = activeCategory === "Tümü" ? true : p.category === activeCategory;
    const text = `${p.title ?? ""} ${p.description ?? ""} ${p.category ?? ""}`.toLowerCase();
    const searchOk = s ? text.includes(s) : true;
    return catOk && searchOk;
  });
}

// ======= Render products =======
const FALLBACK_IMG = "https://via.placeholder.com/900x600?text=BEUShareBox";

function renderProducts() {
  const list = getFilteredProducts();

  if (list.length === 0) {
    productsGrid.innerHTML = `<div class="empty">Henüz paylaşım yok veya filtreye uyan ürün yok.</div>`;
    return;
  }

  productsGrid.innerHTML = list.map((p) => {
    // eski / bozuk verileri toparla
    const imgRaw = safeString(p.image).trim();
    const img = imgRaw ? imgRaw : FALLBACK_IMG;

    const comments = normalizeComments(p.comments);
    const commentsHtml = comments.length
      ? comments.map((c) => `<div class="comment">${escapeHtml(c)}</div>`).join("")
      : `<div class="empty">Henüz yorum yok.</div>`;

    const productUrl = safeString(p.productUrl).trim();
    const linkHtml = (productUrl && isValidUrl(productUrl))
      ? `<a class="productLink" href="${escapeAttr(productUrl)}" target="_blank" rel="noopener">🔗 Ürün Linki</a>`
      : "";

    return `
      <article class="cardItem" data-id="${escapeAttr(p.id)}">
        <img
          class="itemImg"
          src="${escapeAttr(img)}"
          alt="Ürün"
          onerror="this.onerror=null;this.src='${FALLBACK_IMG}';"
        >
        <div class="itemBody">
          <div class="metaRow">
            <div class="badges">
              <span class="badge">${escapeHtml(p.category)}</span>
              <span class="badge">${escapeHtml(p.date)}</span>
            </div>
            <div class="price">${escapeHtml(formatTRY(p.price))}</div>
          </div>

          <h3 class="title">${escapeHtml(p.title)}</h3>

          ${linkHtml}

          <p class="desc">${escapeHtml(p.description || "")}</p>

          <div class="stats">
            <span>Beğeni: ${p.likes || 0}</span>
            <span>Yorum: ${comments.length}</span>
          </div>

          <div class="itemActions">
            <button class="likeBtn" data-action="like">
              <span class="heart">🤍</span>
              <span>Beğen</span>
              <span class="badge">${p.likes || 0}</span>
            </button>
            <button class="smallBtn" data-action="delete">Sil</button>
          </div>

          <div class="commentRow">
            <input type="text" placeholder="Yorum yaz ve Enter'a bas..." data-role="commentInput">
            <button data-action="comment">Ekle</button>
          </div>

          <div class="comments">
            ${commentsHtml}
          </div>
        </div>
      </article>
    `;
  }).join("");

  // Actions
  productsGrid.querySelectorAll(".cardItem").forEach((card) => {
    const id = card.dataset.id;

    card.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;

      const action = btn.dataset.action;
      if (action === "like") likeProduct(id);
      if (action === "delete") deleteProduct(id);
      if (action === "comment") {
        const input = card.querySelector('[data-role="commentInput"]');
        addComment(id, input.value);
        input.value = "";
      }
    });

    const input = card.querySelector('[data-role="commentInput"]');
    input.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        addComment(id, input.value);
        input.value = "";
      }
    });
  });
}

function renderAll() {
  renderCategoryChips();
  renderProducts();
  saveProducts(products);
}

// ======= CRUD =======
async function addProductFromForm() {
  const title = document.getElementById("title").value.trim();
  const price = document.getElementById("price").value.trim();
  const category = document.getElementById("category").value;
  const dateInput = document.getElementById("date").value;
  const description = document.getElementById("description").value.trim();

  const date = dateInput
    ? new Date(dateInput).toLocaleDateString("tr-TR")
    : new Date().toLocaleDateString("tr-TR");

  const image = await getImageData();

  const productUrlRaw = document.getElementById("productUrl").value.trim();
  const productUrl = (productUrlRaw && isValidUrl(productUrlRaw)) ? productUrlRaw : "";

  const product = {
    id: cryptoRandomId(),
    title,
    price: Number(price),
    category,
    date,
    description,
    image: image || "",
    productUrl,
    likes: 0,
    comments: []
  };

  products.unshift(product);
  saveProducts(products);
  renderAll();

  addForm.reset();
}

function likeProduct(id) {
  const p = products.find((x) => x.id === id);
  if (!p) return;
  p.likes = (p.likes || 0) + 1;
  saveProducts(products);
  renderAll();
}

function deleteProduct(id) {
  products = products.filter((x) => x.id !== id);
  saveProducts(products);
  renderAll();
}

function addComment(id, text) {
  const t = String(text || "").trim();
  if (!t) return;
  const p = products.find((x) => x.id === id);
  if (!p) return;

  p.comments = normalizeComments(p.comments);
  p.comments.unshift(t);

  saveProducts(products);
  renderAll();
}

// ======= Events =======
searchInput.addEventListener("input", () => {
  searchText = searchInput.value;
  renderProducts();
});

addForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  await addProductFromForm();
});

clearAllBtn.addEventListener("click", () => {
  if (!confirm("Tüm ürünleri silmek istiyor musun?")) return;
  products = [];
  saveProducts(products);
  renderAll();
});

// ======= Demo data (ilk açılışta boşsa) =======
if (products.length === 0) {
  products = [
    {
      id: cryptoRandomId(),
      title: "Bluetooth Kulaklık",
      price: 899,
      category: "Elektronik",
      date: new Date().toLocaleDateString("tr-TR"),
      description: "Gürültü azaltma güzel, batarya uzun gidiyor.",
      image: "https://images.unsplash.com/photo-1518441902117-f0a229e2edfa?auto=format&fit=crop&w=1200&q=60",
      productUrl: "https://example.com/urun/bluetooth-kulaklik",
      likes: 2,
      comments: ["Link var mı kanka?"]
    }
  ];
  saveProducts(products);
}

renderAll();