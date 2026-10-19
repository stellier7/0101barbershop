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

  function getCategories() {
    const c = getConfig();
    const configured = Array.isArray(c.productCategories) ? c.productCategories : [];
    if (configured.length) return configured.slice();
    const seen = new Set();
    getProducts().forEach((p) => {
      if (p.category) seen.add(p.category);
    });
    return Array.from(seen);
  }

  function productWhatsAppMessage(product) {
    const name = (product && product.name) || "este producto";
    return `Hola, me interesa ${name}`;
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

  function createProductCard(product, options) {
    const opts = options || {};
    const ui = getUi();
    const showAdd = opts.showAdd !== false;
    const interactive = Boolean(opts.onSelect);
    const card = document.createElement("article");
    card.className = "product-card";
    card.dataset.productId = product.id || "";

    const media = document.createElement("div");
    media.className = "product-media";
    const img = document.createElement("img");
    img.src = product.image || "";
    img.alt = product.name || "";
    img.loading = opts.eager ? "eager" : "lazy";
    img.decoding = "async";
    img.draggable = false;
    if (opts.eager) img.fetchPriority = "high";
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

    if (showAdd) {
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
    }

    card.appendChild(media);
    card.appendChild(body);

    if (interactive) {
      card.classList.add("is-clickable");
      card.tabIndex = 0;
      card.setAttribute("role", "button");
      const open = () => opts.onSelect(product);
      card.addEventListener("click", (event) => {
        if (event.target.closest(".product-card-add")) return;
        open();
      });
      card.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        if (event.target.closest(".product-card-add")) return;
        event.preventDefault();
        open();
      });
    }

    return card;
  }

  function initFeaturedMarquee(root) {
    if (!root) return;
    const products = getProducts().filter((p) => p.featured !== false);
    const track = root.querySelector("[data-marquee-track]");
    const section = root.closest("section") || root.parentElement;
    const cta = section ? section.querySelector("[data-products-cta]") : null;
    const ui = getUi();

    if (cta) {
      cta.textContent = ui.productsViewAll || "Ver productos";
      cta.href = "productos.html";
    }

    if (!track || !products.length) {
      root.hidden = true;
      return;
    }

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    track.innerHTML = "";
    const appendSet = () => {
      products.forEach((product) =>
        track.appendChild(
          createProductCard(product, {
            showAdd: true,
            // Eager load so the duplicated loop half never flashes empty/black.
            eager: !reduced
          })
        )
      );
    };
    appendSet();
    if (!reduced) appendSet();
    root.classList.toggle("is-reduced", reduced);
    if (reduced) return;

    // JS-driven loop: continuous autoplay + drag. No hover freeze / resume delay.
    let offset = 0;
    let loopWidth = 0;
    let rafId = 0;
    let lastTs = 0;
    let dragging = false;
    let dragMoved = false;
    let axis = "";
    let pointerId = null;
    let lastX = 0;
    let lastMoveTs = 0;
    let startX = 0;
    let startY = 0;
    const autoplaySpeed = 0.048; // ~48px/s, steady crawl
    let velocity = autoplaySpeed; // px per ms — start at cruise speed (no ramp-up lag)
    let measureTimer = 0;

    function measure() {
      const half = track.scrollWidth / 2;
      const next = half > 0 ? half : 0;
      if (Math.abs(next - loopWidth) < 0.5) return;
      loopWidth = next;
      if (loopWidth > 0) {
        offset = ((offset % loopWidth) + loopWidth) % loopWidth;
        track.style.transform = `translate3d(${-offset}px, 0, 0)`;
      }
    }

    function scheduleMeasure() {
      if (measureTimer) return;
      measureTimer = requestAnimationFrame(() => {
        measureTimer = 0;
        measure();
      });
    }

    function wrapOffset(value) {
      if (loopWidth <= 0) return 0;
      let next = value % loopWidth;
      if (next < 0) next += loopWidth;
      return next;
    }

    function applyOffset() {
      offset = wrapOffset(offset);
      track.style.transform = `translate3d(${-offset}px, 0, 0)`;
    }

    function tick(ts) {
      rafId = requestAnimationFrame(tick);
      if (!loopWidth) return;
      if (!lastTs) lastTs = ts;
      const dt = Math.min(24, Math.max(0, ts - lastTs));
      lastTs = ts;
      if (!dt) return;

      if (dragging && axis === "x") {
        // Position is updated live in pointermove; keep clock warm.
        return;
      }

      // Blend drag coast into autoplay so motion never hard-stops.
      const blend = 1 - Math.exp(-dt / 180);
      velocity += (autoplaySpeed - velocity) * blend;
      offset += velocity * dt;
      applyOffset();
    }

    function onPointerDown(event) {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      if (event.target.closest(".product-card-add")) return;
      dragging = true;
      dragMoved = false;
      axis = "";
      pointerId = event.pointerId;
      startX = lastX = event.clientX;
      startY = event.clientY;
      lastMoveTs = event.timeStamp || performance.now();
    }

    function onPointerMove(event) {
      if (!dragging || event.pointerId !== pointerId) return;
      const dxTotal = event.clientX - startX;
      const dyTotal = event.clientY - startY;
      if (!axis) {
        if (Math.abs(dxTotal) < 6 && Math.abs(dyTotal) < 6) return;
        axis = Math.abs(dxTotal) > Math.abs(dyTotal) ? "x" : "y";
        if (axis === "x") {
          root.classList.add("is-dragging");
          try {
            root.setPointerCapture(event.pointerId);
          } catch (_) {
            /* ignore */
          }
        } else {
          // Vertical intent: release and let the page scroll.
          dragging = false;
          pointerId = null;
          return;
        }
      }
      if (axis !== "x") return;
      const now = event.timeStamp || performance.now();
      const moveDt = Math.max(8, now - lastMoveTs);
      const dx = event.clientX - lastX;
      dragMoved = true;
      lastX = event.clientX;
      lastMoveTs = now;
      offset -= dx;
      velocity = -dx / moveDt;
      applyOffset();
      if (event.cancelable) event.preventDefault();
    }

    function endDrag(event) {
      if (pointerId != null && event && event.pointerId !== pointerId && event.type !== "lostpointercapture") {
        return;
      }
      if (!dragging && !root.classList.contains("is-dragging")) {
        pointerId = null;
        return;
      }
      const didMove = dragMoved;
      dragging = false;
      pointerId = null;
      axis = "";
      root.classList.remove("is-dragging");
      // Clamp extreme flicks, then keep coasting into autoplay with no delay.
      velocity = Math.max(-1.2, Math.min(1.2, velocity));
      if (didMove) root.dataset.suppressClick = "1";
      dragMoved = false;
    }

    root.classList.add("is-js-marquee");
    measure();
    requestAnimationFrame(measure);
    window.addEventListener("resize", scheduleMeasure);
    if (typeof ResizeObserver === "function") {
      const ro = new ResizeObserver(scheduleMeasure);
      ro.observe(track);
      ro.observe(root);
    }

    root.addEventListener("pointerdown", onPointerDown);
    root.addEventListener("pointermove", onPointerMove, { passive: false });
    root.addEventListener("pointerup", endDrag);
    root.addEventListener("pointercancel", endDrag);
    root.addEventListener("lostpointercapture", endDrag);

    // Prevent accidental clicks after a horizontal scrub.
    root.addEventListener(
      "click",
      (event) => {
        if (!root.dataset.suppressClick) return;
        event.preventDefault();
        event.stopPropagation();
        delete root.dataset.suppressClick;
      },
      true
    );

    // Keep autoplay running even when the tab is backgrounded briefly —
    // reset the clock on resume so we don't jump a huge dt.
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") lastTs = 0;
    });

    rafId = requestAnimationFrame(tick);
  }

  function initCatalogPage() {
    const grid = document.getElementById("catalog-grid");
    if (!grid) return;

    const ui = getUi();
    const products = getProducts();
    const categories = getCategories();
    const chipsEl = document.getElementById("catalog-chips");
    const searchEl = document.getElementById("catalog-search");
    const emptyEl = document.getElementById("catalog-empty");
    const modal = document.getElementById("product-modal");
    const modalImg = document.getElementById("product-modal-img");
    const modalName = document.getElementById("product-modal-name");
    const modalCategory = document.getElementById("product-modal-category");
    const modalPrice = document.getElementById("product-modal-price");
    const modalTeaser = document.getElementById("product-modal-teaser");
    const modalWa = document.getElementById("product-modal-whatsapp");
    const modalAdd = document.getElementById("product-modal-add");
    const modalClose = document.getElementById("product-modal-close");
    const modalBackdrop = document.getElementById("product-modal-backdrop");

    let activeCategory = "";
    let query = "";
    let lastFocus = null;
    let activeProduct = null;

    const title = document.getElementById("catalog-title");
    const subtitle = document.getElementById("catalog-subtitle");
    if (title) title.textContent = ui.catalogTitle || "Productos";
    if (subtitle) subtitle.textContent = ui.catalogSubtitle || "";
    if (searchEl) {
      searchEl.placeholder = ui.catalogSearchPlaceholder || "Buscar producto…";
    }
    if (emptyEl) emptyEl.textContent = ui.catalogEmpty || "No hay productos con ese filtro.";
    if (modalAdd) modalAdd.textContent = ui.catalogAddToCart || "Agregar al carrito";
    if (modalWa) {
      modalWa.innerHTML = `
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.13-2.9-7C17.18 3.03 14.7 2 12.04 2Zm0 18.14h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.23 8.23 0 0 1-1.26-4.37c0-4.55 3.7-8.25 8.26-8.25 2.2 0 4.27.86 5.83 2.42a8.18 8.18 0 0 1 2.41 5.84c0 4.55-3.71 8.22-8.25 8.22Z"/></svg>
        <span>${esc(ui.catalogWhatsApp || "Consultar por WhatsApp")}</span>`;
    }

    if (chipsEl) {
      const allLabel = ui.catalogFilterAll || "Todos";
      chipsEl.innerHTML = [
        `<button type="button" class="catalog-chip is-active" data-category="" aria-pressed="true">${esc(allLabel)}</button>`
      ].concat(
        categories.map(
          (cat) =>
            `<button type="button" class="catalog-chip" data-category="${esc(cat)}" aria-pressed="false">${esc(cat)}</button>`
        )
      ).join("");

      chipsEl.addEventListener("click", (event) => {
        const btn = event.target.closest(".catalog-chip");
        if (!btn || !chipsEl.contains(btn)) return;
        activeCategory = btn.dataset.category || "";
        chipsEl.querySelectorAll(".catalog-chip").forEach((chip) => {
          const on = chip === btn;
          chip.classList.toggle("is-active", on);
          chip.setAttribute("aria-pressed", on ? "true" : "false");
        });
        render();
      });
    }

    if (searchEl) {
      searchEl.addEventListener("input", () => {
        query = searchEl.value.trim().toLowerCase();
        render();
      });
    }

    function matches(product) {
      if (activeCategory && product.category !== activeCategory) return false;
      if (!query) return true;
      const hay = `${product.name || ""} ${product.category || ""} ${product.teaser || ""}`.toLowerCase();
      return hay.includes(query);
    }

    function closeModal() {
      if (!modal || modal.hidden) return;
      modal.hidden = true;
      modal.setAttribute("aria-hidden", "true");
      document.body.classList.remove("product-modal-open");
      activeProduct = null;
      if (modalImg) modalImg.removeAttribute("src");
      if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
    }

    function openModal(product, trigger) {
      if (!modal || !product) return;
      activeProduct = product;
      lastFocus = trigger || document.activeElement;
      if (modalName) modalName.textContent = product.name || "";
      if (modalCategory) {
        modalCategory.textContent = product.category || "";
        modalCategory.hidden = !product.category;
      }
      if (modalTeaser) {
        modalTeaser.textContent = product.teaser || "";
        modalTeaser.hidden = !product.teaser;
      }
      const priceText = formatPrice(product.price);
      if (modalPrice) {
        modalPrice.textContent = priceText;
        modalPrice.hidden = !priceText;
      }
      if (modalImg) {
        modalImg.src = product.image || "";
        modalImg.alt = product.name || "";
      }
      if (modalAdd) {
        modalAdd.textContent = ui.catalogAddToCart || "Agregar al carrito";
        modalAdd.classList.remove("is-added");
      }
      modal.hidden = false;
      modal.setAttribute("aria-hidden", "false");
      document.body.classList.add("product-modal-open");
      if (modalAdd) modalAdd.focus();
    }

    function render() {
      const filtered = products.filter(matches);
      grid.innerHTML = "";
      filtered.forEach((product) => {
        const card = createProductCard(product, {
          showAdd: true,
          onSelect: () => openModal(product, card)
        });
        grid.appendChild(card);
      });
      if (emptyEl) emptyEl.hidden = filtered.length > 0;
    }

    if (modalAdd) {
      modalAdd.addEventListener("click", () => {
        if (!activeProduct) return;
        addToCart(activeProduct.id, 1);
        modalAdd.textContent = ui.cartAdded || "Agregado";
        modalAdd.classList.add("is-added");
        setTimeout(() => {
          if (!activeProduct) return;
          modalAdd.textContent = ui.catalogAddToCart || "Agregar al carrito";
          modalAdd.classList.remove("is-added");
        }, 1200);
      });
    }

    if (modalWa) {
      modalWa.addEventListener("click", (event) => {
        if (!activeProduct) return;
        const message = productWhatsAppMessage(activeProduct);
        const locs = locations();
        if (typeof global.openLocationPicker === "function" && locs.length > 1) {
          event.preventDefault();
          closeModal();
          global.openLocationPicker(modalWa, message);
          return;
        }
        if (locs[0]) {
          event.preventDefault();
          global.open(waLinkFor(locs[0], message), "_blank", "noopener");
        }
      });
    }

    if (modalClose) modalClose.addEventListener("click", closeModal);
    if (modalBackdrop) modalBackdrop.addEventListener("click", closeModal);
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      const drawer = document.getElementById("cart-drawer");
      if (drawer && !drawer.hidden) return;
      closeModal();
    });

    render();
  }

  global.ProductsUI = {
    initCartUI,
    initFeaturedMarquee,
    initCatalogPage,
    cartWhatsAppMessage,
    addToCart
  };
})(window);
