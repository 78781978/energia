import { Marked } from "marked";

const md = new Marked({ gfm: true, breaks: false });

// Linki zewnętrzne otwieramy bezpiecznie; tabele owijamy, by przewijały się na telefonie.
// Surowy HTML w treści (np. wklejony z innej strony) jest wyświetlany jako tekst – bezpieczeństwo strony publicznej.
md.use({
  renderer: {
    html({ text }) {
      return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    },
  },
});
// Linki zewnętrzne otwieramy w nowej karcie; adresy typu javascript: są blokowane.
md.use({
  walkTokens(token) {
    if ((token.type === "link" || token.type === "image") && /^\s*(javascript|data|vbscript):/i.test(token.href)) token.href = "#";
  },
});
md.use({
  hooks: {
    postprocess(html: string) {
      return html
        .replace(/<table>/g, '<div class="table-wrap"><table>')
        .replace(/<\/table>/g, "</table></div>")
        .replace(/<a href="(https?:\/\/[^"]+)"/g, '<a href="$1" target="_blank" rel="noopener noreferrer"');
    },
  },
});

export function renderMarkdown(src: string): string {
  return md.parse(src, { async: false }) as string;
}

export type Block =
  | { type: "html"; html: string }
  | { type: "cta"; callout: string | null; ctas: string[] };

/** Dzieli treść podstrony na bloki tekstu i bloki z przyciskami ({{callout|…}} / {{cta|…}}). */
export function toBlocks(body: string): Block[] {
  const blocks: Block[] = [];
  const lines = body.replace(/\r\n?/g, "\n").split("\n");
  let buf: string[] = [];
  let cur: { callout: string | null; ctas: string[] } | null = null;
  const flushText = () => {
    const text = buf.join("\n").trim();
    if (text) blocks.push({ type: "html", html: renderMarkdown(text) });
    buf = [];
  };
  const flushCta = () => {
    if (cur && (cur.ctas.length || cur.callout)) blocks.push({ type: "cta", ...cur });
    cur = null;
  };
  for (const line of lines) {
    const callout = line.match(/^\{\{callout\|(.+)\}\}$/);
    const cta = line.match(/^\{\{cta\|(.+)\}\}$/);
    if (callout || cta) {
      if (!cur) {
        flushText();
        cur = { callout: null, ctas: [] };
      }
      if (callout) cur.callout = callout[1];
      if (cta && !cur.ctas.includes(cta[1])) cur.ctas.push(cta[1]);
    } else {
      if (cur && line.trim() === "") continue;
      flushCta();
      buf.push(line);
    }
  }
  flushCta();
  flushText();
  return blocks;
}

/** Usuwa znaczniki markdown – do opisów, JSON-LD itp. */
export function plain(text: string): string {
  return text.replace(/\*\*/g, "").replace(/\{\{(cta|callout)\|[^}]+\}\}/g, "").replace(/\s+/g, " ").trim();
}
