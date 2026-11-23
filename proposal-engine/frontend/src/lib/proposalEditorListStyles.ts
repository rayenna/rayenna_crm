/**
 * CSS for custom-section Numbering Library parenthesis styles
 * (not available as native list-style-type). Used in the editor and PDF print CSS.
 */
export const PE_CUSTOM_LIST_STYLE_CSS = `
[data-pe-list="decimal-paren"],
[data-pe-list="lower-alpha-paren"] {
  list-style: none !important;
  padding-left: 1.5em !important;
  counter-reset: pe-item;
}
[data-pe-list="decimal-paren"] > li,
[data-pe-list="lower-alpha-paren"] > li {
  counter-increment: pe-item;
}
[data-pe-list="decimal-paren"] > li::before {
  content: counter(pe-item) ") ";
  margin-right: 0.3em;
}
[data-pe-list="lower-alpha-paren"] > li::before {
  content: counter(pe-item, lower-alpha) ") ";
  margin-right: 0.3em;
}
`.trim();
