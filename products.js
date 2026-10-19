// Product marquee + WhatsApp cart for 0101 Barbershop (adapted from Scarleth).
(function (global) {
  "use strict";

  const CART_KEY = "0101-cart-v1";

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (ch) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      })[ch]
    );
  }

  function getConfig() {
    if (typeof CONFIG !== "undefined") return CONFIG;
    return global.CONFIG || {};
  }

  function getProducts() {
    const c = getConfig();
    return Array.isArray(c.products) ? c.products : [];
  }

  function getProductById(id) {
    return getProducts().find((p) => p.id === id) || null;
  }

  function getUi() {
    return getConfig().ui || {};
  }

  function locations() {
    const c = getConfig();
    return Array.isArray(c.locations) ? c.locations : [];
  }

  function waLinkFor(location, message) {
    const text = message || getConfig().business?.whatsappMessage || "Hola";
    return `https://wa.me/${location.whatsappNumber}?text=${encodeURIComponent(text)}`;
  }

  function formatPrice(price) {
    if (price == null || price === "") return "";
    if (typeof price === "number") {
      return `L ${price.toLocaleString("es-HN", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      })}`;
    }
    return String(price);
  }

  function readCart() {
    try {
      const raw = global.localStorage.getItem(CART_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((item) => ({
          id: String(item.id || ""),
          qty: Math.max(1, Math.min(99, parseInt(item.qty, 10) || 1))
        }))
        .filter((item) => item.id && getProductById(item.id));
    } catch {
      return [];
    }
  }

  function writeCart(items) {
    global.localStorage.setItem(CART_KEY, JSON.stringify(items));
    syncCartBadge();
    global.dispatchEvent(new CustomEvent("barbershop:cart-change"));
  }

  function cartCount() {
    return readCart().reduce((sum, item) => sum + item.qty, 0);
  }

  function addToCart(productId, qty) {
    const product = getProductById(productId);
    if (!product) return;
    const items = readCart();
    const existing = items.find((item) => item.id === productId);
    if (existing) {
      existing.qty = Math.min(99, existing.qty + (qty || 1));
    } else {
      items.push({ id: productId, qty: Math.max(1, qty || 1) });
    }
    writeCart(items);
  }

  function setCartQty(productId, qty) {
    let items = readCart();
    if (qty <= 0) {
      items = items.filter((item) => item.id !== productId);
    } else {
      const existing = items.find((item) => item.id === productId);
      if (existing) existing.qty = Math.min(99, qty);
      else items.push({ id: productId, qty: Math.min(99, qty) });
    }
    writeCart(items);
  }

  function clearCart() {
    writeCart([]);
  }

  function cartLines() {
    return readCart()
      .map((item) => {
        const product = getProductById(item.id);
        return product ? { product, qty: item.qty } : null;
      })
      .filter(Boolean);
  }

  function cartWhatsAppMessage() {
    const ui = getUi();
    const intro = ui.cartWhatsAppIntro || "Hola, me interesa este pedido:";
    const outro = ui.cartWhatsAppOutro || "¡Gracias!";
    const lines = cartLines().map((line) => {
      const template = ui.cartItemLine || "{qty}× {name}";
      return template
        .replace("{qty}", String(line.qty))
        .replace("{name}", line.product.name || "");
    });
    return [intro, ...lines, outro].filter(Boolean).join("\n");
  }

  function syncCartBadge() {
    const count = cartCount();
    const ui = getUi();
    document.querySelectorAll("[data-cart-count]").forEach((el) => {
      el.textContent = count ? String(count) : "";
      el.hidden = !count;
    });
    document.querySelectorAll("[data-cart-toggle]").forEach((el) => {
      const label = ui.cartLabel || "Carrito";
      el.setAttribute("aria-label", count ? `${label} (${count})` : label);
    });
  }

  function ensureCartDom() {
    if (document.getElementById("cart-drawer")) return;
    const ui = getUi();
    const drawer = document.createElement("div");
    drawer.className = "cart-drawer";
    drawer.id = "cart-drawer";
    drawer.hidden = true;
    drawer.setAttribute("aria-hidden", "true");
    drawer.setAttribute("role", "dialog");
    drawer.setAttribute("aria-modal", "true");
    drawer.setAttribute("aria-labelledby", "cart-drawer-title");
    drawer.innerHTML = `
      <button type="button" class="cart-drawer-backdrop" data-cart-close tabindex="-1" aria-label="${esc(ui.cartClose || "Cerrar carrito")}"></button>
      <div class="cart-drawer-panel">
        <div class="cart-drawer-head">
          <h2 id="cart-drawer-title">${esc(ui.cartTitle || "Tu carrito")}</h2>
          <button type="button" class="cart-drawer-close" data-cart-close aria-label="${esc(ui.cartClose || "Cerrar carrito")}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke-linecap="round"/></svg>
          </button>
        </div>
        <div class="cart-drawer-body" data-cart-body></div>
        <div class="cart-drawer-foot" data-cart-foot hidden>
          <button type="button" class="btn btn-primary" data-cart-checkout>
            <span data-cart-checkout-label>${esc(ui.cartCheckout || "Pedir por WhatsApp")}</span>
          </button>
          <button type="button" class="cart-clear" data-cart-clear>${esc(ui.cartClear || "Vaciar carrito")}</button>
        </div>
      </div>
    `;
    document.body.appendChild(drawer);
  }

  function ensureNavCartButton() {
    if (document.querySelector("[data-cart-toggle]")) return;
    const nav = document.getElementById("nav");
    const whatsapp = document.getElementById("nav-whatsapp");
    if (!nav || !whatsapp) return;
    const ui = getUi();
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "nav-cart";
    btn.setAttribute("data-cart-toggle", "");
    btn.setAttribute("aria-label", ui.cartLabel || "Carrito");
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M6 7h15l-1.4 8.2a2 2 0 0 1-2 1.8H9.2a2 2 0 0 1-2-1.7L5.2 4.5A1.5 1.5 0 0 0 3.7 3.2H2"/><circle cx="10" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/></svg>
      <span class="nav-cart-count" data-cart-count hidden></span>`;
    whatsapp.insertAdjacentElement("beforebegin", btn);
  }

  function renderCartDrawer() {
    const drawer = document.getElementById("cart-drawer");
    if (!drawer) return;
    const ui = getUi();
    const body = drawer.querySelector("[data-cart-body]");
    const foot = drawer.querySelector("[data-cart-foot]");
    const lines = cartLines();

    if (!lines.length) {
      body.innerHTML = `<p class="cart-empty">${esc(ui.cartEmpty || "Tu carrito está vacío.")}</p>`;
      if (foot) foot.hidden = true;
      return;
    }

    body.innerHTML = lines
      .map(({ product, qty }) => `
        <article class="cart-line" data-cart-line="${esc(product.id)}">
          <div class="cart-line-media">
            <img src="${esc(product.image || "")}" alt="${esc(product.name || "")}" loading="lazy" decoding="async">
          </div>
          <div class="cart-line-info">
            <p class="cart-line-cat">${esc(product.category || "")}</p>
            <h3 class="cart-line-name">${esc(product.name || "")}</h3>
            <div class="cart-line-controls">
              <button type="button" class="cart-qty-btn" data-cart-dec aria-label="-">−</button>
              <span class="cart-qty">${qty}</span>
              <button type="button" class="cart-qty-btn" data-cart-inc aria-label="+">+</button>
              <button type="button" class="cart-line-remove" data-cart-remove>${esc(ui.cartRemove || "Quitar")}</button>
            </div>
          </div>
        </article>
      `)
      .join("");

    if (foot) foot.hidden = false;
  }

  function openCart() {
    ensureCartDom();
    renderCartDrawer();
    const drawer = document.getElementById("cart-drawer");
    if (!drawer) return;
    drawer.hidden = false;
    drawer.setAttribute("aria-hidden", "false");
    document.body.classList.add("cart-open");
  }

  function closeCart() {
    const drawer = document.getElementById("cart-drawer");
    if (!drawer || drawer.hidden) return;
    drawer.hidden = true;
    drawer.setAttribute("aria-hidden", "true");
    document.body.classList.remove("cart-open");
  }

  function checkoutCart(trigger) {
    const message = cartWhatsAppMessage();
    const locs = locations();
    if (typeof global.openLocationPicker === "function" && locs.length > 1) {
      closeCart();
      global.openLocationPicker(trigger, message);
      return;
    }
    if (locs[0]) {
      global.open(waLinkFor(locs[0], message), "_blank", "noopener");
    }
  }

  function initCartUI() {
    ensureNavCartButton();
    ensureCartDom();
    syncCartBadge();

    document.addEventListener("click", (event) => {
      if (event.target.closest("[data-cart-toggle]")) {
        event.preventDefault();
        openCart();
        return;
      }
      if (event.target.closest("[data-cart-close]")) {
        closeCart();
        return;
      }
      const checkout = event.target.closest("[data-cart-checkout]");
      if (checkout) {
        event.preventDefault();
        checkoutCart(checkout);
        return;
      }
      if (event.target.closest("[data-cart-clear]")) {
        clearCart();
        renderCartDrawer();
        return;
      }
      const line = event.target.closest("[data-cart-line]");
      if (!line) return;
      const id = line.getAttribute("data-cart-line");
      const current = readCart().find((item) => item.id === id);
      if (!current) return;
      if (event.target.closest("[data-cart-inc]")) {
        setCartQty(id, current.qty + 1);
        renderCartDrawer();
        return;
      }
      if (event.target.closest("[data-cart-dec]")) {
        setCartQty(id, current.qty - 1);
        renderCartDrawer();
        return;
      }
      if (event.target.closest("[data-cart-remove]")) {
        setCartQty(id, 0);
        renderCartDrawer();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      const drawer = document.getElementById("cart-drawer");
      if (drawer && !drawer.hidden) {
        closeCart();
        event.stopPropagation();
      }
    });

    global.addEventListener("barbershop:cart-change", () => {
      const drawer = document.getElementById("cart-drawer");
      if (drawer && !drawer.hidden) renderCartDrawer();
    });
  }

  function createProductCard(product) {
    const ui = getUi();
    const card = document.createElement("article");
    card.className = "product-card";
    card.dataset.productId = product.id || "";

    const media = document.createElement("div");
    media.className = "product-media";
    const img = document.createElement("img");
    img.src = product.image || "";
    img.alt = product.name || "";
    img.loading = "lazy";
    img.decoding = "async";
    img.draggable = false;
    media.appendChild(img);

    const body = document.createElement("div");
    body.className = "product-card-body";

    if (product.category) {
      const tag = document.createElement("span");
      tag.className = "product-tag";
      tag.textContent = product.category;
      body.appendChild(tag);
    }

    const title = document.createElement("h3");
    title.className = "product-name";
    title.textContent = product.name || "";
    body.appendChild(title);

    if (product.teaser) {
      const teaser = document.createElement("p");
      teaser.className = "product-teaser";
      teaser.textContent = product.teaser;
      body.appendChild(teaser);
    }

    const priceText = formatPrice(product.price);
    if (priceText) {
      const price = document.createElement("p");
      price.className = "product-price";
      price.textContent = priceText;
      body.appendChild(price);
    }

    const actions = document.createElement("div");
    actions.className = "product-card-actions";
    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "product-card-add";
    addBtn.textContent = ui.catalogAddToCart || "Agregar al carrito";
    addBtn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      addToCart(product.id, 1);
      addBtn.textContent = ui.cartAdded || "Agregado";
      addBtn.classList.add("is-added");
      setTimeout(() => {
        addBtn.textContent = ui.catalogAddToCart || "Agregar al carrito";
        addBtn.classList.remove("is-added");
      }, 1200);
    });
    actions.appendChild(addBtn);
    body.appendChild(actions);

    card.appendChild(media);
    card.appendChild(body);
    return card;
  }

  function initFeaturedMarquee(root) {
    if (!root) return;
    const products = getProducts().filter((p) => p.featured !== false);
    const track = root.querySelector("[data-marquee-track]");
    if (!track || !products.length) {
      root.hidden = true;
      return;
    }

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    track.innerHTML = "";
    const appendSet = () => {
      products.forEach((product) => track.appendChild(createProductCard(product)));
    };
    appendSet();
    if (!reduced) appendSet();
    root.classList.toggle("is-reduced", reduced);
    if (reduced) return;

    const pause = () => root.classList.add("is-paused");
    const resume = () => root.classList.remove("is-paused");
    root.addEventListener("mouseenter", pause);
    root.addEventListener("mouseleave", resume);
    root.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      pause();
    }, { passive: true });
    root.addEventListener("pointerup", resume, { passive: true });
    root.addEventListener("pointercancel", resume, { passive: true });
  }

  global.ProductsUI = {
    initCartUI,
    initFeaturedMarquee,
    cartWhatsAppMessage,
    addToCart
  };
})(window);
