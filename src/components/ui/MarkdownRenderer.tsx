/**
 * ContentRenderer – safely renders both HTML (Tiptap output) and legacy markdown strings.
 *
 * Security: strips dangerous tags/attributes via an allowlist sanitiser before
 * using dangerouslySetInnerHTML, so no rehype-raw or DOMPurify package required.
 */

// ─── Safe HTML sanitiser ──────────────────────────────────────────────────────

const ALLOWED_TAGS = new Set([
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ins', 's', 'del', 'strike',
  'ul', 'ol', 'li', 'blockquote', 'hr', 'a', 'span', 'code', 'pre',
  'h1', 'h2', 'h3', 'h4', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'img'
]);

const ALLOWED_ATTRS: Record<string, string[]> = {
  a:    ['href', 'title', 'rel', 'target'],
  span: ['style'],
  code: ['class'],
  '*':  [],
};

/** Strip any attribute whose value contains a script or event handler. */
function isSafeAttrValue(value: string): boolean {
  const lower = value.toLowerCase();
  return !lower.includes('javascript:') && !lower.includes('data:') && !lower.startsWith('on');
}

/** Returns a sanitised copy of the HTML string. */
function sanitize(html: string): string {
  // Use DOMParser only in browser context
  if (typeof document === 'undefined') return '';

  const doc = new DOMParser().parseFromString(html, 'text/html');

  function cleanNode(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) return;

    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      const tag = el.tagName.toLowerCase();

      // Remove disallowed tags entirely (keep children for some)
      if (!ALLOWED_TAGS.has(tag)) {
        // Replace with fragment of children for inline wrappers; remove otherwise
        if (['video', 'iframe', 'script', 'embed', 'object', 'form', 'input'].includes(tag)) {
          el.parentNode?.removeChild(el);
          return;
        }
        // Replace div/section with its children inlined
        const frag = document.createDocumentFragment();
        while (el.firstChild) frag.appendChild(el.firstChild);
        el.parentNode?.replaceChild(frag, el);
        return;
      }

      // Strip disallowed attributes
      const allowedForTag = [...(ALLOWED_ATTRS[tag] ?? []), ...(ALLOWED_ATTRS['*'] ?? [])];
      const attrNames = Array.from(el.attributes).map((a) => a.name);
      for (const attr of attrNames) {
        if (!allowedForTag.includes(attr)) {
          el.removeAttribute(attr);
        } else {
          const val = el.getAttribute(attr) ?? '';
          if (!isSafeAttrValue(val)) el.removeAttribute(attr);
        }
      }

      // Force links to open safely
      if (tag === 'a') {
        el.setAttribute('rel', 'noopener noreferrer');
        el.setAttribute('target', '_blank');
      }

      // Restrict <span style> to color only
      if (tag === 'span') {
        const style = el.getAttribute('style') ?? '';
        const colorMatch = style.match(/color\s*:\s*([^;]+)/i);
        if (colorMatch) {
          el.setAttribute('style', `color: ${colorMatch[1].trim()}`);
        } else {
          el.removeAttribute('style');
        }
      }

      // Recurse into children
      Array.from(el.childNodes).forEach(cleanNode);
    }
  }

  Array.from(doc.body.childNodes).forEach(cleanNode);
  return doc.body.innerHTML;
}

// ─── Legacy markdown converter (for old string-stored content) ─────────────

function isLikelyMarkdown(content: string): boolean {
  // Heuristic: if content starts with '<' it's HTML; otherwise try markdown
  return !content.trim().startsWith('<');
}

function markdownToHtml(md: string): string {
  return md
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Unordered lists
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    // Wrap consecutive <li> in <ul>
    .replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`)
    // Line breaks → paragraphs
    .split(/\n\n+/)
    .map((para) => {
      const trimmed = para.trim();
      if (trimmed.startsWith('<ul>') || trimmed.startsWith('<ol>') || trimmed.startsWith('<blockquote>')) return trimmed;
      // Single newlines within a paragraph
      return `<p>${trimmed.replace(/\n/g, '<br />')}</p>`;
    })
    .join('');
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ContentRendererProps {
  content: string;
}

export default function ContentRenderer({ content }: ContentRendererProps) {
  if (!content) return null;

  const rawHtml = isLikelyMarkdown(content) ? markdownToHtml(content) : content;
  const safeHtml = sanitize(rawHtml);

  return (
    <div
      className="
        text-xs text-lng-grey leading-relaxed
        [&_p]:mb-2 [&_p]:leading-relaxed [&_p:last-child]:mb-0
        [&_strong]:font-bold [&_strong]:text-gray-900
        [&_em]:italic
        [&_u]:underline
        [&_s]:line-through [&_del]:line-through
        [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2 [&_ul]:space-y-1
        [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-2 [&_ol]:space-y-1
        [&_li]:text-xs [&_li]:text-lng-grey
        [&_blockquote]:border-l-4 [&_blockquote]:border-gray-200 [&_blockquote]:pl-3
        [&_blockquote]:italic [&_blockquote]:text-gray-500 [&_blockquote]:my-2
        [&_a]:font-semibold [&_a]:text-lng-blue [&_a]:hover:underline [&_a]:break-words
        [&_code]:rounded [&_code]:bg-gray-100 [&_code]:px-1.5 [&_code]:py-0.5
        [&_code]:font-mono [&_code]:text-[10px] [&_code]:text-lng-red
        [&_pre]:bg-gray-50 [&_pre]:p-3 [&_pre]:rounded [&_pre]:overflow-x-auto
        [&_pre]:border [&_pre]:border-gray-100 [&_pre]:my-2
        [&_hr]:border-gray-200 [&_hr]:my-3
        [&_table]:w-full [&_table]:border-collapse [&_table]:text-xs [&_table]:my-2
        [&_th]:border [&_th]:border-gray-200 [&_th]:bg-gray-50 [&_th]:px-2 [&_th]:py-1 [&_th]:font-semibold
        [&_td]:border [&_td]:border-gray-200 [&_td]:px-2 [&_td]:py-1
        [&_img]:max-w-full [&_img]:h-auto
      "
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  );
}

// ─── Named alias for backward compatibility ────────────────────────────────────
export { ContentRenderer as MarkdownRenderer };
