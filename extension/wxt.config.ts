import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "Word Ledger",
    description: "Tra EN⇔VI trên mọi trang và lưu vào sổ Word Ledger.",
    permissions: ["contextMenus", "sidePanel", "cookies", "tabs"],
    host_permissions: [
      "http://localhost:3000/*",
      "http://localhost:3001/*",
      "http://127.0.0.1:3000/*",
      "http://127.0.0.1:3001/*",
    ],
    action: {
      default_title: "Word Ledger",
    },
    icons: {
      16: "icon.png",
      32: "icon.png",
      48: "icon.png",
      128: "icon.png",
    },
  },
});
