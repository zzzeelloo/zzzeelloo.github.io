// Utilitaires
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

// Curseur personnalisé
(() => {
  const dot = document.getElementById("cursor-dot");
  const outline = document.getElementById("cursor-outline");

  if (!dot || !outline) return;

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let outlineX = mouseX;
  let outlineY = mouseY;

  const speed = 0.16;

  const move = (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  };

  const loop = () => {
    outlineX += (mouseX - outlineX) * speed;
    outlineY += (mouseY - outlineY) * speed;

    dot.style.transform = `translate(${mouseX}px, ${mouseY}px)`;
    outline.style.transform = `translate(${outlineX}px, ${outlineY}px) translate(-50%, -50%)`;

    requestAnimationFrame(loop);
  };

  window.addEventListener("mousemove", move);

  const hoverSelectors = [
    "a",
    "button",
    ".btn",
    ".project-card",
    ".skill-card",
    ".about-card",
    ".tilt",
  ];
  const hoverElements = document.querySelectorAll(hoverSelectors.join(","));

  hoverElements.forEach((el) => {
    el.addEventListener("mouseenter", () =>
      document.body.classList.add("cursor-hover")
    );
    el.addEventListener("mouseleave", () =>
      document.body.classList.remove("cursor-hover")
    );
  });

  loop();
})();

// Navigation mobile
(() => {
  const header = document.querySelector(".header");
  const toggle = document.querySelector(".nav-toggle");
  const navLinks = document.querySelectorAll(".nav a");

  if (!header || !toggle) return;

  toggle.addEventListener("click", () => {
    header.classList.toggle("nav-open");
  });

  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      header.classList.remove("nav-open");
    });
  });
})();

// Tilt des cartes (parallax léger au survol)
(() => {
  const cards = document.querySelectorAll(".tilt");

  cards.forEach((card) => {
    const rect = card.getBoundingClientRect();

    let hovering = false;

    const onEnter = () => {
      hovering = true;
    };

    const onLeave = () => {
      hovering = false;
      card.style.transform = "perspective(700px) rotateX(0deg) rotateY(0deg)";
    };

    const onMove = (e) => {
      const bounds = card.getBoundingClientRect();
      const x = e.clientX - bounds.left;
      const y = e.clientY - bounds.top;
      const xNorm = x / bounds.width - 0.5;
      const yNorm = y / bounds.height - 0.5;

      const rotateX = clamp(-yNorm * 10, -10, 10);
      const rotateY = clamp(xNorm * 10, -10, 10);

      if (!hovering) return;

      card.style.transform = `perspective(700px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-2px)`;
    };

    card.addEventListener("mouseenter", onEnter);
    card.addEventListener("mouseleave", onLeave);
    card.addEventListener("mousemove", onMove);
  });
})();

// Année dynamique dans le footer
(() => {
  const yearSpan = document.getElementById("year");
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear().toString();
  }
})();

// Bloc de "simili code" interactif dans le hero
(() => {
  const panel = document.querySelector(".hero-code");
  const body = panel?.querySelector(".code-window-body");

  if (!panel || !body) return;

  let hovering = false;

  const onEnter = () => {
    hovering = true;
    panel.classList.add("is-executing");
  };

  const onLeave = () => {
    hovering = false;
    panel.classList.remove("is-executing");
    panel.style.transform = "translate3d(0, 0, 0)";
    panel.style.boxShadow = "";
    body.style.transform = "translate3d(0, 0, 0)";
  };

  const onMove = (e) => {
    if (!hovering) return;

    const bounds = panel.getBoundingClientRect();
    const x = (e.clientX - bounds.left) / bounds.width - 0.5;
    const y = (e.clientY - bounds.top) / bounds.height - 0.5;

    const translateX = clamp(x * 18, -18, 18);
    const translateY = clamp(y * 12, -12, 12);

    panel.style.transform = `translate3d(${translateX}px, ${translateY}px, 0)`;
    body.style.transform = `translate3d(${translateX * -0.6}px, ${
      translateY * -0.6
    }px, 0)`;
    panel.style.boxShadow = `0 26px 60px rgba(15, 23, 42, ${
      0.6 + Math.min(Math.abs(x) + Math.abs(y), 1) * 0.25
    })`;
  };

  panel.addEventListener("mouseenter", onEnter);
  panel.addEventListener("mouseleave", onLeave);
  panel.addEventListener("mousemove", onMove);
})();

// Apparition des sections au scroll (droite / gauche en alternance)
(() => {
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  let lastScrollY = window.scrollY;
  let scrollDirection = "down";

  window.addEventListener(
    "scroll",
    () => {
      const currentY = window.scrollY;
      scrollDirection = currentY > lastScrollY ? "down" : "up";
      lastScrollY = currentY;
    },
    { passive: true }
  );

  const sections = Array.from(
    document.querySelectorAll("main .section, main .section-alt")
  );

  if (!sections.length || prefersReducedMotion) return;

  sections.forEach((section, index) => {
    section.classList.add("scroll-reveal");
    section.classList.add(index % 2 === 0 ? "from-right" : "from-left");
  });

  if (!("IntersectionObserver" in window)) {
    sections.forEach((section) => section.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const el = entry.target;

        if (entry.isIntersecting) {
          el.classList.add("is-visible");
        } else if (scrollDirection === "up") {
          el.classList.remove("is-visible");
        }
      });
    },
    {
      threshold: 0.45,
      rootMargin: "0px 0px -10% 0px",
    }
  );

  sections.forEach((section) => observer.observe(section));
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
        headers: { "Content-Type": "application/json" },
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

