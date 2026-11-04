// Structural HTML check. Browsers accept any input, so "valid" here means:
// tags are well-formed, every non-void element is closed in the right order
// (except elements whose end tag HTML allows you to omit), and comments end.

export type HtmlIssue = { message: string; line: number };
export type HtmlValidation = { ok: boolean; errors: HtmlIssue[] };

const VOID = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input", "link",
  "meta", "source", "track", "wbr", "param", "keygen",
]);

// End tag may be omitted per the HTML spec; closed implicitly.
const OPTIONAL_END = new Set([
  "p", "li", "dt", "dd", "tr", "td", "th", "thead", "tbody", "tfoot",
  "option", "optgroup", "colgroup", "rt", "rp", "html", "head", "body", "caption",
]);

// Contents are raw text up to the matching close tag.
const RAW_TEXT = new Set(["script", "style", "textarea", "title"]);

const MAX_ERRORS = 20;

export function validateHtml(src: string): HtmlValidation {
  const errors: HtmlIssue[] = [];
  const add = (message: string, line: number) => {
    if (errors.length < MAX_ERRORS) errors.push({ message, line });
  };

  if (!src.trim()) {
    return { ok: false, errors: [{ message: "HTML content is empty.", line: 1 }] };
  }

  // Precompute line starts for offset -> line lookups.
  const lineStarts = [0];
  for (let i = 0; i < src.length; i++) if (src[i] === "\n") lineStarts.push(i + 1);
  const lineAt = (offset: number) => {
    let lo = 0;
    let hi = lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (lineStarts[mid] <= offset) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  };

  const stack: { name: string; line: number }[] = [];
  let sawTag = false;
  let i = 0;

  while (i < src.length) {
    const lt = src.indexOf("<", i);
    if (lt === -1) break;
    const line = lineAt(lt);

    // Comment
    if (src.startsWith("<!--", lt)) {
      const end = src.indexOf("-->", lt + 4);
      if (end === -1) {
        add("Unterminated comment: missing `-->`.", line);
        break;
      }
      i = end + 3;
      continue;
    }

    // Doctype / CDATA / other declarations
    if (src[lt + 1] === "!" || src[lt + 1] === "?") {
      const end = src.indexOf(">", lt);
      if (end === -1) {
        add("Unterminated declaration: missing `>`.", line);
        break;
      }
      sawTag = true;
      i = end + 1;
      continue;
    }

    const isClose = src[lt + 1] === "/";
    const nameMatch = /^[a-zA-Z][a-zA-Z0-9-]*/.exec(src.slice(lt + (isClose ? 2 : 1), lt + 80));
    if (!nameMatch) {
      // A bare "<" in text (e.g. "a < b"); browsers treat it as text.
      i = lt + 1;
      continue;
    }
    const name = nameMatch[0].toLowerCase();

    // Scan to the end of the tag, honouring quoted attribute values.
    let j = lt + (isClose ? 2 : 1) + nameMatch[0].length;
    let quote: string | null = null;
    let quoteLine = line;
    while (j < src.length) {
      const c = src[j];
      if (quote) {
        if (c === quote) quote = null;
      } else if (c === '"' || c === "'") {
        // Only a quote right after "=" (optionally spaced) opens a value.
        const before = src.slice(lt, j).trimEnd();
        if (before.endsWith("=")) {
          quote = c;
          quoteLine = lineAt(j);
        }
      } else if (c === ">") {
        break;
      }
      j++;
    }
    if (j >= src.length) {
      add(
        quote
          ? `Unclosed attribute quote (${quote}) in <${name}>.`
          : `Tag <${isClose ? "/" : ""}${name}> is missing its closing \`>\`.`,
        quote ? quoteLine : line,
      );
      break;
    }
    sawTag = true;
    const selfClosing = !isClose && src[j - 1] === "/";
    i = j + 1;

    if (isClose) {
      if (VOID.has(name)) continue; // e.g. </br>, harmless
      const idx = findOpen(stack, name);
      if (idx === -1) {
        if (!OPTIONAL_END.has(name)) add(`Stray closing tag </${name}> has no matching opening tag.`, line);
        continue;
      }
      // Anything opened after the match must be implicitly closable.
      for (let k = stack.length - 1; k > idx; k--) {
        const open = stack[k];
        if (!OPTIONAL_END.has(open.name)) {
          add(`Expected </${open.name}> (opened on line ${open.line}) but found </${name}>.`, line);
        }
      }
      stack.length = idx;
      continue;
    }

    if (VOID.has(name) || selfClosing) continue;

    if (RAW_TEXT.has(name)) {
      const closeRe = new RegExp(`</${name}\\s*>`, "i");
      const rest = src.slice(i);
      const m = closeRe.exec(rest);
      if (!m) {
        add(`Unclosed <${name}>: missing </${name}>.`, line);
        break;
      }
      i += m.index + m[0].length;
      continue;
    }

    stack.push({ name, line });
  }

  for (const open of stack) {
    if (!OPTIONAL_END.has(open.name)) add(`Unclosed <${open.name}> (opened on line ${open.line}).`, open.line);
  }

  if (!sawTag && errors.length === 0) {
    add("This doesn't look like HTML: no tags found.", 1);
  }

  return { ok: errors.length === 0, errors };
}

function findOpen(stack: { name: string }[], name: string): number {
  for (let k = stack.length - 1; k >= 0; k--) if (stack[k].name === name) return k;
  return -1;
}
