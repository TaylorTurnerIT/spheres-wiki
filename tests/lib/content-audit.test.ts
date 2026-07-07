import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { parse as parseYaml } from "yaml";
import { z } from "zod";

// Mock Astro virtual modules before importing content config
vi.mock("astro:content", () => ({
  defineCollection: (x: any) => x,
  z,
}));

vi.mock("astro/loaders", () => ({
  glob: (x: any) => x,
}));

// Now import entrySchema safely
import { entrySchema } from "../../src/content.config";
import { inferFromPath } from "../../src/lib/inferFromPath";

function getFilesRecursively(dir: string): string[] {
  const results: string[] = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat?.isDirectory()) {
      results.push(...getFilesRecursively(filePath));
    } else if (file.endsWith(".md")) {
      results.push(filePath);
    }
  }
  return results;
}

describe("Content Audit", () => {
  const contentDir = path.resolve(__dirname, "../../src/content");
  const spritePath = path.resolve(
    __dirname,
    "../../src/components/SVGSprite.astro",
  );

  const symbolIds = new Set<string>();

  if (fs.existsSync(spritePath)) {
    const spriteContent = fs.readFileSync(spritePath, "utf8");
    const symbolRegex = /<symbol\s+id="([^"]+)"/g;
    let match;
    while ((match = symbolRegex.exec(spriteContent)) !== null) {
      symbolIds.add(match[1]);
    }
  }

  if (!fs.existsSync(contentDir)) {
    it("skips if content dir does not exist", () => {});
    return;
  }

  const mdFiles = getFilesRecursively(contentDir);

  it(`found some markdown files`, () => {
    expect(mdFiles.length).toBeGreaterThan(0);
  });

  for (const filePath of mdFiles) {
    const relativePath = path.relative(contentDir, filePath);
    const fileSlug = path.basename(filePath, ".md");

    // Path format is: book-slug/type-dir/filename.md
    const pathParts = relativePath.split(path.sep);
    const bookSlug = pathParts[0];

    describe(`File: ${relativePath}`, () => {
      const fileContent = fs.readFileSync(filePath, "utf8");

      // Parse YAML frontmatter between --- and ---
      const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---/;
      const match = fileContent.match(frontmatterRegex);

      it("has valid frontmatter block", () => {
        expect(match).not.toBeNull();
      });

      if (!match) return;

      const yamlStr = match[1];
      let frontmatter: any = null;

      it("parses as valid YAML", () => {
        expect(() => {
          frontmatter = parseYaml(yamlStr);
        }).not.toThrow();
      });

      it("complies with V1: matches entrySchema", () => {
        if (!frontmatter) return;

        // Extract relative path inside the book directory
        const fileId = pathParts.slice(1).join("/");
        const inferred = inferFromPath(fileId);
        const merged = { ...inferred, ...frontmatter };

        const result = entrySchema.safeParse(merged);
        if (!result.success) {
          const errors = result.error.issues
            .map((e) => `${e.path.join(".")}: ${e.message}`)
            .join(", ");
          expect.fail(`Schema validation failed: ${errors}`);
        }
      });

      it("complies with V2: frontmatter ID matches filename", () => {
        if (!frontmatter) return;
        expect(frontmatter.id).toBe(fileSlug);
      });

      it("complies with V3: sourceBook matches the parent book slug", () => {
        if (!frontmatter) return;
        if (frontmatter.sourceBook !== undefined) {
          expect(frontmatter.sourceBook).toBe(bookSlug);
        }
      });

      if (frontmatter && frontmatter.type === "sphere") {
        it("complies with V5: sphere icon exists in SVGSprite.astro", () => {
          const expectedSymbolId = `si-${frontmatter.icon}`;
          if (!symbolIds.has(expectedSymbolId)) {
            expect.fail(
              `Sphere icon "${frontmatter.icon}" resolved as "${expectedSymbolId}" is missing from SVGSprite.astro`,
            );
          }
        });
      }
    });
  }
});

describe("Feat entry schema: optional summary field", () => {
  const baseFeat = {
    type: "feat",
    id: "example-feat",
    name: "Example Feat",
  };

  it("validates a feat entry with a summary string", () => {
    const result = entrySchema.safeParse({
      ...baseFeat,
      summary: "A one-line description of what this feat does.",
    });
    expect(result.success).toBe(true);
  });

  it("validates a feat entry without a summary field", () => {
    const result = entrySchema.safeParse(baseFeat);
    expect(result.success).toBe(true);
  });
});
