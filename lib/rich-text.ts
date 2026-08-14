import sanitizeHtml from "sanitize-html";

const options: sanitizeHtml.IOptions = {
  allowedTags: ["p", "div", "br", "strong", "b", "em", "i", "u", "span", "font"],
  allowedAttributes: {
    font: ["face", "size"],
    span: ["style"],
  },
  allowedStyles: {
    span: {
      "font-family": [/^(Arial|Georgia|Verdana|Times New Roman|Courier New)(,\s*(sans-serif|serif|monospace))?$/i],
      "font-size": [/^(12|14|16|18|20|24)px$/],
    },
  },
  disallowedTagsMode: "discard",
};

export function sanitizeRichText(value: string | null | undefined) {
  return sanitizeHtml(value ?? "", options).trim();
}

export function richTextToPlainText(value: string | null | undefined) {
  return sanitizeHtml(value ?? "", { allowedTags: [], allowedAttributes: {} })
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
