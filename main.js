// Utilitaires
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

document.documentElement.classList.add("js");

// Fond : houle de particules 3D
(() => {
  const target = document.getElementById("bg-3d");
  if (!target || typeof ParticleField === "undefined") return;
  new ParticleField(target).start();
})();

// Curseur : petit point discret qui suit la souris avec inertie et laisse une traînée qui s'estompe
(() => {
  if (!finePointer) return;

  const TRAIL_MS = 260; // durée de vie d'un point de la traînée
  const FOLLOW = 0.32; // inertie du point (par frame à 60 fps)
  const TRAIL_RGB = "124, 242, 176";

  const dot = document.createElement("div");
  dot.id = "cursor";
  dot.setAttribute("aria-hidden", "true");
  const canvas = document.createElement("canvas");
  canvas.id = "cursor-trail";
  canvas.setAttribute("aria-hidden", "true");
  document.body.append(canvas, dot);
  document.documentElement.classList.add("has-cursor");

  const ctx = canvas.getContext("2d");
  const hoverSelector = "a, button, .spotlight, label";
  const textSelector = "input, textarea";
  let dpr = 1;
  let target = null;
  let x = 0;
  let y = 0;
  let points = [];
  let running = false;
  let last = 0;

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const drawTrail = (now) => {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    if (points.length < 3) return;

    ctx.lineCap = "round";
    // Courbe lissée : on passe par les milieux des segments successifs
    for (let i = 1; i < points.length - 1; i++) {
      const p0 = points[i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const life = 1 - (now - p1.t) / TRAIL_MS; // 0 = ancien, 1 = récent
      if (life <= 0) continue;

      ctx.beginPath();
      ctx.moveTo((p0.x + p1.x) / 2, (p0.y + p1.y) / 2);
      ctx.quadraticCurveTo(p1.x, p1.y, (p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
      ctx.lineWidth = 0.5 + life * 2.5;
      ctx.strokeStyle = `rgba(${TRAIL_RGB}, ${(life * life * 0.35).toFixed(3)})`;
      ctx.stroke();
    }
  };

  const frame = (now) => {
    const dt = Math.min((now - last) / 16.67, 4); // en « frames à 60 fps »
    last = now;

    const k = reducedMotion ? 1 : 1 - Math.pow(1 - FOLLOW, dt);
    x += (target.x - x) * k;
    y += (target.y - y) * k;
    dot.style.transform = `translate3d(${x}px, ${y}px, 0)`;

    if (!reducedMotion) {
      const prev = points[points.length - 1];
      // On n'ajoute un point que si le curseur a bougé : immobile, la traînée s'éteint
      if (!prev || Math.hypot(prev.x - x, prev.y - y) > 0.5) points.push({ x, y, t: now });
      points = points.filter((p) => now - p.t < TRAIL_MS);
      drawTrail(now);
    }

    // La boucle s'arrête quand le point est posé et que la traînée a disparu
    const settled = Math.abs(target.x - x) < 0.1 && Math.abs(target.y - y) < 0.1;
    if (settled && points.length === 0) {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      running = false;
      return;
    }
    requestAnimationFrame(frame);
  };

  const start = () => {
    if (running) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(frame);
  };

  window.addEventListener(
    "pointermove",
    (e) => {
      if (e.pointerType !== "mouse") return;
      if (!target) {
        x = e.clientX;
        y = e.clientY;
      }
      target = { x: e.clientX, y: e.clientY };
      document.documentElement.classList.add("cursor-visible");
      start();
    },
    { passive: true }
  );

  document.addEventListener("pointerover", (e) => {
    const el = e.target instanceof Element ? e.target : null;
    document.documentElement.classList.toggle("cursor-hover", !!el?.closest(hoverSelector));
    document.documentElement.classList.toggle("cursor-text", !!el?.closest(textSelector));
  });
  document.addEventListener("pointerdown", () => document.documentElement.classList.add("cursor-down"));
  document.addEventListener("pointerup", () => document.documentElement.classList.remove("cursor-down"));
  document.documentElement.addEventListener("pointerleave", () =>
    document.documentElement.classList.remove("cursor-visible")
  );

  window.addEventListener("resize", resize);
  resize();
})();

// Navigation par vues : une seule section affichée à la fois.
// Un clic sur un lien interne fait surgir un terminal qui exécute le code de la section,
// puis on « traverse » le terminal pour entrer dans la nouvelle vue.
(() => {
  // Un script par vue : shell, C, Makefile, C++
  const SCRIPTS = {
    hero: {
      file: "~/.zshrc",
      lines: [
        { kind: "cmd", text: "cd ~ && clear" },
        { kind: "out", text: "retour à l'accueil" },
      ],
    },
    about: {
      file: "about.sh",
      lines: [
        { kind: "code", text: 'echo "$(whoami) — étudiant @ 42"' },
        { kind: "cmd", text: "bash about.sh" },
        { kind: "out", text: "profil chargé" },
      ],
    },
    skills: {
      file: "skills.c",
      lines: [
        { kind: "code", text: "int main(void) { return (load_skills(3)); }" },
        { kind: "cmd", text: "cc -Wall -Wextra -Werror skills.c && ./a.out" },
        { kind: "out", text: "3 domaines chargés" },
      ],
    },
    projects: {
      file: "Makefile",
      lines: [
        { kind: "code", text: "NAME = projects" },
        { kind: "cmd", text: "make re" },
        { kind: "out", text: "projets compilés", progress: 14 },
      ],
    },
    contact: {
      file: "main.cpp",
      lines: [
        { kind: "code", text: 'Server(6667, "contact").run();' },
        { kind: "cmd", text: "./ircserv 6667 contact" },
        { kind: "out", text: "en écoute sur le port 6667 — prêt à recevoir ton message" },
      ],
    },
  };

  const CHARS_PER_SEC = 75;
  const SPIN_MS = 520;
  const KEYWORDS = new Set(["int", "void", "return", "echo", "NAME"]);
  const SPINNER = "⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏";

  const root = document.documentElement;
  const views = new Map([...document.querySelectorAll("[data-view]")].map((v) => [v.id, v]));
  const navLinks = [...document.querySelectorAll(".nav a")];
  let current = null;
  let busy = false;
  let skip = false;

  if (!views.size) return;
  root.classList.add("has-views");

  // --- Visite guidée (bouton Get Started) ---

  const TOUR = ["about", "skills", "projects", "contact"];
  let touring = false;

  // Barre de progression en haut de chaque étape : « ← Accueil » + pastilles + compteur
  TOUR.forEach((id, i) => {
    const view = views.get(id);
    const back = view?.querySelector(".view-back");
    if (!back) return;

    const bar = document.createElement("div");
    bar.className = "view-bar";
    back.replaceWith(bar);
    back.removeAttribute("data-reveal");
    bar.setAttribute("data-reveal", "");

    const progress = document.createElement("div");
    progress.className = "tour-progress";
    progress.style.setProperty("--step", i);
    progress.innerHTML =
      `<span class="tour-track"><span class="tour-fill"></span></span>` +
      `<span class="tour-count">${i + 1} / ${TOUR.length}</span>`;
    progress.setAttribute("aria-label", `Étape ${i + 1} sur ${TOUR.length}`);
    progress.style.setProperty("--from", `${(i / TOUR.length) * 100}%`);
    progress.style.setProperty("--to", `${((i + 1) / TOUR.length) * 100}%`);
    bar.append(back, progress);
  });

  // En visite, le lien du bas devient un bouton « Continuer » (ou « Terminer » à la fin)
  const nextLinks = TOUR.map((id) => views.get(id)?.querySelector(".view-next")).filter(Boolean);
  nextLinks.forEach((link) => {
    link.dataset.kicker = link.querySelector(".view-next-kicker").textContent;
  });

  const setTour = (on) => {
    touring = on;
    root.classList.toggle("is-touring", on);
    nextLinks.forEach((link) => {
      const last = link.getAttribute("href") === "#hero";
      link.querySelector(".view-next-kicker").textContent = on
        ? last ? "Terminer la visite" : "Continuer"
        : link.dataset.kicker;
    });
  };

  // --- Petits outils d'animation (rAF : fluide et calé sur l'écran) ---

  const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));

  // Pause interrompue si l'utilisateur demande à passer
  const pause = async (ms, skippable = true) => {
    const end = performance.now() + ms;
    while (performance.now() < end && !(skippable && skip)) await nextFrame();
  };

  // --- Affichage d'une vue ---

  const show = (id, { animate }) => {
    const view = views.get(id) || views.get("hero");
    if (current === view) return;

    if (current) {
      current.classList.remove("is-active", "is-entering");
      current.dispatchEvent(new CustomEvent("view:leave", { bubbles: true }));
    }

    root.style.scrollBehavior = "auto";
    window.scrollTo(0, 0);
    root.style.scrollBehavior = "";

    view.classList.toggle("is-entering", animate);
    view.classList.add("is-active");
    view.dispatchEvent(new CustomEvent("view:enter", { bubbles: true }));
    current = view;

    navLinks.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === `#${view.id}`));

    // Retour à l'accueil = fin de la visite
    if (view.id === "hero" && touring) setTour(false);
  };

  // --- Terminal ---

  const overlay = document.createElement("div");
  overlay.id = "exec-overlay";
  overlay.setAttribute("aria-hidden", "true");
  overlay.innerHTML = `
    <div class="x-window">
      <div class="x-head"><span></span><span></span><span></span><b class="x-file"></b></div>
      <div class="x-body"></div>
    </div>`;
  document.body.appendChild(overlay);
  const fileEl = overlay.querySelector(".x-file");
  const body = overlay.querySelector(".x-body");

  // Coloration minimale : chaînes, options, mots-clés, fonctions, commande
  const tokenize = (text, kind) => {
    const parts = text.match(/"[^"]*"|-{1,2}[\w-]+|\s+|[\w.]+|./g) || [];
    let firstWord = true;

    return parts.map((part, i) => {
      let cls = "";
      if (/^\s+$/.test(part)) return { text: part, cls };
      const next = parts.slice(i + 1).find((p) => !/^\s+$/.test(p));

      if (part.startsWith('"')) cls = "val";
      else if (kind === "cmd" && part.startsWith("-")) cls = "flag";
      else if (KEYWORDS.has(part)) cls = "kw";
      else if (kind === "cmd" && firstWord && /\w/.test(part)) cls = "fn";
      else if (next === "(" && /\w/.test(part)) cls = "fn";

      if (/\w/.test(part)) firstWord = false;
      return { text: part, cls };
    });
  };

  // Le texte est posé d'avance (invisible) : la fenêtre ne change jamais de taille pendant la frappe
  const build = (script) => {
    fileEl.textContent = script.file;
    body.textContent = "";

    return script.lines.map((step) => {
      const el = document.createElement("div");
      el.className = `x-line x-${step.kind}`;
      const line = { ...step, el, chars: [] };

      if (step.kind === "out") {
        line.spin = document.createElement("span");
        line.spin.className = "x-spin";
        line.label = document.createElement("span");
        line.label.className = "x-out-text";
        line.label.textContent = step.progress ? `${step.progress} ${step.text}` : step.text;
        el.append(line.spin, line.label);
      } else {
        if (step.kind === "cmd") {
          const prompt = document.createElement("span");
          prompt.className = "x-prompt";
          prompt.textContent = "$ ";
          el.appendChild(prompt);
        }
        tokenize(step.text, step.kind).forEach((tok) => {
          const span = document.createElement("span");
          if (tok.cls) span.className = `x-${tok.cls}`;
          [...tok.text].forEach((c) => {
            const ch = document.createElement("span");
            ch.className = "ch";
            ch.textContent = c;
            span.appendChild(ch);
            line.chars.push(ch);
          });
          el.appendChild(span);
        });
      }

      body.appendChild(el);
      return line;
    });
  };

  // Frappe pilotée par le temps écoulé (et non par des setTimeout) : vitesse régulière
  const type = async (chars) => {
    const start = performance.now();
    let shown = 0;
    while (shown < chars.length) {
      const target = skip
        ? chars.length
        : Math.min(chars.length, Math.floor(((performance.now() - start) / 1000) * CHARS_PER_SEC));
      if (target > shown) {
        chars[shown - 1]?.classList.remove("caret");
        while (shown < target) chars[shown++].classList.add("on");
        chars[shown - 1].classList.add("caret");
      }
      if (shown < chars.length) await nextFrame();
    }
  };

  const execute = async (lines) => {
    let last = null;
    for (const line of lines) {
      line.el.classList.add("is-on");

      if (line.kind === "out") {
        last?.classList.remove("caret");
        const start = performance.now();
        let elapsed = 0;
        while (elapsed < SPIN_MS && !skip) {
          line.spin.textContent = SPINNER[Math.floor(elapsed / 70) % SPINNER.length];
          if (line.progress) {
            const n = Math.max(1, Math.ceil((elapsed / SPIN_MS) * line.progress));
            line.label.textContent = `[${String(n).padStart(2, " ")}/${line.progress}] compilation…`;
          }
          await nextFrame();
          elapsed = performance.now() - start;
        }
        line.spin.textContent = "✓";
        if (line.progress) line.label.textContent = `${line.progress} ${line.text}`;
        line.el.classList.add("is-done");
      } else {
        last?.classList.remove("caret");
        await type(line.chars);
        last = line.chars[line.chars.length - 1];
        await pause(140);
      }
    }
  };

  // --- Passage d'une vue à l'autre ---

  const go = async (id, { push = true } = {}) => {
    if (busy || !views.has(id) || views.get(id) === current) return;

    if (reducedMotion) {
      show(id, { animate: false });
      if (push) history.pushState(null, "", `#${id}`);
      return;
    }

    busy = true;
    skip = false;
    const lines = build(SCRIPTS[id]);
    overlay.classList.remove("is-exiting");
    void overlay.offsetWidth; // repart de l'état initial
    overlay.classList.add("is-open");
    current?.classList.add("is-leaving"); // la vue actuelle recule derrière le terminal

    await pause(380);
    await execute(lines);
    await pause(220);

    // L'exécution nous fait entrer : changement de vue pendant que le terminal est traversé
    current?.classList.remove("is-leaving");
    show(id, { animate: true });
    if (push) history.pushState(null, "", `#${id}`);
    overlay.classList.add("is-exiting");
    await pause(700, false);

    overlay.classList.remove("is-open", "is-exiting");
    busy = false;
  };

  // Vue de départ : celle de l'URL (sans terminal), sinon l'accueil
  show(location.hash.slice(1), { animate: false });

  document.addEventListener("click", (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;
    const id = link.getAttribute("href").slice(1);
    if (!views.has(id)) return;
    e.preventDefault();
    if (link.hasAttribute("data-tour") && !busy) setTour(true);
    go(id);
  });

  // Boutons précédent / suivant du navigateur
  window.addEventListener("popstate", () => go(location.hash.slice(1) || "hero", { push: false }));

  // Pendant l'exécution : scroll bloqué ; Échap / Entrée / Espace / clic accélèrent
  const block = (e) => {
    if (busy) e.preventDefault();
  };
  window.addEventListener("wheel", block, { passive: false });
  window.addEventListener("touchmove", block, { passive: false });
  window.addEventListener("keydown", (e) => {
    if (!busy) return;
    if ([" ", "Enter", "Escape"].includes(e.key)) skip = true;
    if ([" ", "PageDown", "PageUp", "ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) e.preventDefault();
  });
  overlay.addEventListener("click", () => {
    skip = true;
  });
})();

// Effet magnétique : les tuiles suivent légèrement la souris
(() => {
  if (!finePointer || reducedMotion) return;

  document.querySelectorAll("[data-magnetic]").forEach((el) => {
    const strength = el.classList.contains("hub-tile") ? 8 : 6;

    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const dx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      const dy = ((e.clientY - r.top) / r.height - 0.5) * 2;
      el.style.setProperty("--tx", `${(dx * strength).toFixed(2)}px`);
      el.style.setProperty("--ty", `${(dy * strength).toFixed(2)}px`);
    });
    el.addEventListener("pointerleave", () => {
      el.style.setProperty("--tx", "0px");
      el.style.setProperty("--ty", "0px");
    });
  });
})();

// Header : fond flouté dès qu'on a scrollé
(() => {
  const header = document.querySelector(".header");
  if (!header) return;

  const update = () => header.classList.toggle("is-scrolled", window.scrollY > 8);
  window.addEventListener("scroll", update, { passive: true });
  update();
})();

// Navigation mobile
(() => {
  const header = document.querySelector(".header");
  const toggle = document.querySelector(".nav-toggle");
  const navLinks = document.querySelectorAll(".nav a");

  if (!header || !toggle) return;

  const setOpen = (open) => {
    header.classList.toggle("nav-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
  };

  toggle.addEventListener("click", () => setOpen(!header.classList.contains("nav-open")));
  navLinks.forEach((link) => link.addEventListener("click", () => setOpen(false)));

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setOpen(false);
  });
  document.addEventListener("click", (e) => {
    if (!header.contains(e.target)) setOpen(false);
  });
})();

// Halo qui suit la souris sur les cartes
(() => {
  if (!finePointer) return;

  document.querySelectorAll(".spotlight").forEach((el) => {
    el.addEventListener("pointermove", (e) => {
      const bounds = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - bounds.left}px`);
      el.style.setProperty("--my", `${e.clientY - bounds.top}px`);
    });
  });
})();

// Apparition au scroll : une seule fois, déclenchée tôt (fonctionne aussi pour les blocs très hauts)
(() => {
  const items = [...document.querySelectorAll("[data-reveal]")];

  // Décalage en cascade pour les éléments d'une même grille
  items.forEach((el) => {
    const siblings = [...el.parentElement.children].filter((c) => c.hasAttribute("data-reveal"));
    const i = siblings.indexOf(el);
    if (siblings.length > 1) el.style.setProperty("--d", `${(i % 3) * 80}ms`);
  });

  if (reducedMotion || !("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        // Seuls les éléments de la vue affichée apparaissent
        const view = entry.target.closest("[data-view]");
        if (view && !view.classList.contains("is-active")) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
  );

  items.forEach((el) => observer.observe(el));

  // Entrée dans une vue : on ré-observe ses éléments pour relancer leur apparition
  document.addEventListener("view:enter", (e) => {
    e.target.querySelectorAll("[data-reveal]").forEach((el) => {
      observer.unobserve(el);
      observer.observe(el);
    });
  });

  // Sortie d'une vue : ses éléments se remettent en attente pour rejouer l'animation au retour
  document.addEventListener("view:leave", (e) => {
    e.target.querySelectorAll("[data-reveal]").forEach((el) => el.classList.remove("is-visible"));
  });
})();

// Année dynamique dans le footer
(() => {
  const yearSpan = document.getElementById("year");
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear().toString();
  }
})();

// Formulaire de contact — envoi via Formspree (reçu direct dans ta boîte mail, pas de serveur)
(() => {
  const form = document.querySelector(".contact-form");
  const submitBtn = document.getElementById("contact-submit");
  const feedbackEl = document.getElementById("contact-feedback");

  if (!form || !feedbackEl) return;

  const formspreeId = form.getAttribute("data-formspree-id") || "";

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = form.querySelector("#name").value.trim();
    const email = form.querySelector("#email").value.trim();
    const message = form.querySelector("#message").value.trim();

    if (!name || !email || !message) {
      showFeedback("Remplis tous les champs.", false);
      return;
    }

    if (!formspreeId || formspreeId === "TON_ID_FORMSPREE") {
      showFeedback("Configure ton ID Formspree dans le formulaire (data-formspree-id). Va sur formspree.io pour en créer un.", false);
      return;
    }

    const originalLabel = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = "Envoi…";
    feedbackEl.hidden = true;

    try {
      const res = await fetch(`https://formspree.io/f/${formspreeId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          name,
          email,
          message,
          _replyto: email,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        showFeedback("Message envoyé. Je te répondrai rapidement.", true);
        form.reset();
      } else {
        showFeedback(data.error || "Erreur lors de l'envoi. Réessaie.", false);
      }
    } catch (err) {
      showFeedback("Impossible d'envoyer le message. Vérifie ta connexion.", false);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalLabel;
    }
  });

  function showFeedback(text, isSuccess) {
    feedbackEl.textContent = text;
    feedbackEl.hidden = false;
    feedbackEl.classList.toggle("contact-feedback--success", isSuccess);
    feedbackEl.classList.toggle("contact-feedback--error", !isSuccess);
  }
})();
