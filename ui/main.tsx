import { StrictMode, type ReactElement } from "react";
import { createRoot } from "react-dom/client";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Missing #root element");
const root = createRoot(rootElement);

function render(element: ReactElement) {
  root.render(<StrictMode>{element}</StrictMode>);
}

// `?preview` shows the new paper components in isolation (M2.1) until the new App replaces the old one (M2.4).
// Each branch loads its own stylesheet, so the old and new looks never mix.
if (new URLSearchParams(window.location.search).has("preview")) {
  void import("./dev/PaperPreview").then(({ PaperPreview }) => render(<PaperPreview />));
} else {
  void Promise.all([import("./App"), import("./styles.css")]).then(([{ App }]) => render(<App />));
}
