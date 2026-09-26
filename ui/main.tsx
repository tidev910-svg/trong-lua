import { StrictMode, type ReactElement } from "react";
import { createRoot } from "react-dom/client";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Missing #root element");
const root = createRoot(rootElement);

function render(element: ReactElement) {
  root.render(<StrictMode>{element}</StrictMode>);
}

// `?preview` / `?preview=scene` are dev pages showing components in isolation (M2.1, M2.2).
const preview = new URLSearchParams(window.location.search).get("preview");
if (preview === "scene") {
  void import("./dev/ScenePreview").then(({ ScenePreview }) => render(<ScenePreview />));
} else if (preview !== null) {
  void import("./dev/PaperPreview").then(({ PaperPreview }) => render(<PaperPreview />));
} else {
  void Promise.all([import("./App"), import("./theme.css")]).then(([{ App }]) => render(<App />));
}
