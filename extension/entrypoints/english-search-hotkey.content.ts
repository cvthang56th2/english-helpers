import { isEnglishSearchHotkey } from "../lib/google-search/keyword-search";
import { sendMessage } from "../lib/messages";

export default defineContentScript({
  matches: ["http://*/*", "https://*/*"],
  allFrames: true,
  runAt: "document_start",
  main() {
    window.addEventListener(
      "keydown",
      (event) => {
        if (!isEnglishSearchHotkey(event)) return;
        event.preventDefault();
        event.stopPropagation();
        void sendMessage({ type: "OPEN_KEYWORD_PROMPT" });
      },
      true
    );
  },
});
