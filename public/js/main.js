// Mobile menu
const toggle = document.querySelector(".nav-toggle");
const nav = document.getElementById("site-nav");
toggle.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  toggle.setAttribute("aria-expanded", open);
});
nav.addEventListener("click", (e) => {
  if (e.target.tagName === "A") {
    nav.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  }
});

document.getElementById("year").textContent = new Date().getFullYear();

// Contact form: send with fetch so the page doesn't reload
const form = document.querySelector(".contact-form");
const status = form.querySelector(".form-status");
const button = form.querySelector("button[type=submit]");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!form.reportValidity()) return;

  button.disabled = true;
  button.textContent = "Sending…";
  status.className = "form-status";
  status.textContent = "";

  try {
    const res = await fetch(form.action, { method: "POST", body: new FormData(form) });
    const out = await res.json().catch(() => ({}));
    if (!res.ok || !out.ok) throw new Error(out.error || "Something went wrong. Please try again.");
    form.reset();
    status.classList.add("success");
    status.textContent = "Thanks! I'll be in touch soon to start planning.";
  } catch (err) {
    status.classList.add("error");
    status.textContent = err.message;
  } finally {
    if (window.turnstile) window.turnstile.reset();
    button.disabled = false;
    button.textContent = "Send";
  }
});
