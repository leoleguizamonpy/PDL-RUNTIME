import { createPDLApp } from "./index.js";

const root = document.querySelector("[data-pdl-app]");

createPDLApp({
  root,
  manifest: root?.dataset?.manifest || "/product.ui.json"
}).catch(error => {
  if (!root) throw error;
  root.setAttribute("data-pdl-error", "true");
  root.textContent = error instanceof Error ? error.message : "No se pudo iniciar la aplicación.";
});
