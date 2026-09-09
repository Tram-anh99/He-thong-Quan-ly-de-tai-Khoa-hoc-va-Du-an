import sanitizeHtml from "sanitize-html";

export function cleanHtml(value: string | null | undefined): string | null {
     if (!value) return null;
     return sanitizeHtml(value, {
          allowedTags: ["p", "br", "strong", "b", "em", "i", "u", "s", "h1", "h2", "h3", "h4",
               "ul", "ol", "li", "blockquote", "pre", "code", "span", "div", "table", "thead", "tbody", "tr", "th", "td", "a"],
          allowedAttributes: { a: ["href", "title"], td: ["colspan", "rowspan"], th: ["colspan", "rowspan"] },
          allowedSchemes: ["https", "http", "mailto"], allowProtocolRelative: false,
     });
}
