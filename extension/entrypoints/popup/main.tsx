import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "../../lib/ui.css";

document.documentElement.style.width = "360px";
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
