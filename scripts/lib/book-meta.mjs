import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";

function readBookMeta(contentDir, entry) {
  if (!entry.isDirectory()) return null;
  const filePath = path.join(contentDir, entry.name, "_book.yaml");
  if (!fs.existsSync(filePath)) return null;
  return [entry.name, parseYaml(fs.readFileSync(filePath, "utf8")) ?? {}];
}

export function loadBookMeta(contentDir) {
  return new Map(
    fs
      .readdirSync(contentDir, { withFileTypes: true })
      .map((entry) => readBookMeta(contentDir, entry))
      .filter((entry) => entry !== null),
  );
}
