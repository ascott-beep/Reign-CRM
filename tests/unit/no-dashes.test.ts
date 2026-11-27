import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import ts from "typescript";

/**
 * Round 4 ground rule 2: no em dash (—) or en dash (–) anywhere a user
 * might see it, including seed data. Replace with a middle dot, a comma,
 * or "to" for a range; leave empty values blank. This walks the real
 * source tree with the TypeScript compiler (not a plain-text grep) so it
 * only flags string/template literals and JSX text, not code comments.
 */
const DASH_RE = /[—–]/;

const ROOT = path.resolve(__dirname, "../..");
const TARGETS = [path.join(ROOT, "src"), path.join(ROOT, "prisma/seed.ts")];

function collectFiles(target: string, files: string[]) {
  const stat = fs.statSync(target);
  if (stat.isDirectory()) {
    for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
      collectFiles(path.join(target, entry.name), files);
    }
  } else if (/\.(ts|tsx)$/.test(target)) {
    files.push(target);
  }
}

function findDashesInFile(file: string): string[] {
  const text = fs.readFileSync(file, "utf8");
  if (!DASH_RE.test(text)) return [];

  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const hits: string[] = [];

  function visit(node: ts.Node) {
    const isTextNode = ts.isStringLiteralLike(node) || ts.isTemplateLiteral(node) || ts.isJsxText(node);
    if (isTextNode && DASH_RE.test(node.getText(sf))) {
      const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
      hits.push(`${path.relative(ROOT, file)}:${line + 1}: ${node.getText(sf).replace(/\s+/g, " ").trim().slice(0, 140)}`);
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
  return hits;
}

describe("no em dash or en dash in user-facing text", () => {
  it("has no — or – in any string, template literal or JSX text under src/ or prisma/seed.ts", () => {
    const files: string[] = [];
    for (const target of TARGETS) collectFiles(target, files);

    const hits = files.flatMap(findDashesInFile);

    expect(
      hits,
      hits.length > 0
        ? `Found ${hits.length} em dash / en dash occurrence(s) in user-facing text. Replace with a middle dot (·), a comma, or "to" for a range, per ground rule 2:\n${hits.join("\n")}`
        : undefined,
    ).toEqual([]);
  });
});
