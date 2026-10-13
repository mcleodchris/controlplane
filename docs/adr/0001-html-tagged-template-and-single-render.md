# HTML is built with our own `html` tag and written only through `render`

Pages build their markup as strings, and hand-copied `_escapeHtml` helpers let third-party data (webmention author photos and URLs) break out of attributes and smuggle in `javascript:` links. We built a small vanilla `html` tagged template in `src/lib/html/html.js` that escapes every interpolation by default and checks URL schemes in URL attributes, plus a `render(el, view)` function that is the only code allowed to write `innerHTML` — enforced by an ESLint `no-restricted-syntax` rule.

## Considered Options

- **lit-html / DOMPurify** — rejected: brings a rendering model (or a sanitiser) at odds with the project's vanilla, no-framework stance, for a problem a ~100-line module solves.
- **Exported escape helpers (`escapeText`, `escapeAttr`, `safeUrl`)** — rejected: opt-in per interpolation is the exact failure mode that caused the bug; a forgotten call is unsafe.
- **`html` returning a string-coercible value without `render`** — rejected: nothing would stop a raw template literal being assigned to `innerHTML` again.

## Consequences

- There is deliberately no raw-HTML or trusted-URL escape hatch. Add one only when a real caller needs it, and keep it lint-visible.
- `blob:` URLs are allowed in `src`/`poster` (our own previews) but not `href`.
