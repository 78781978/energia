#!/usr/bin/env node
/**
 * Wersja schematu Prisma dla MySQL / MariaDB (10.6+, testowane na 10.11):
 *   node scripts/schema-mysql.mjs prisma/schema.prisma dist/prisma/schema.prisma
 *
 * MariaDB domyślnie tworzy pola tekstowe jako VARCHAR(191). Długie treści (opisy, treści z panelu, logi, adresy)
 * nie zmieściłyby się, dlatego:
 *  - pola tekstowe, które nie są kluczem, indeksem, relacją ani nie mają wartości domyślnej → TEXT,
 *  - pola unikalne (e-mail, slug, nazwa pliku) → VARCHAR(255),
 *  - identyfikatory, klucze obce i pola indeksowane zostają VARCHAR(191) (limit długości indeksu).
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

// pola, które mogą być długie (treści z panelu, JSON, log zmian) – MEDIUMTEXT (do 16 MB)
const MEDIUM = new Set(["PageContent.data", "Setting.value", "Post.body", "AuditLog.changes"]);

const [, , src = "prisma/schema.prisma", out = "dist/prisma/schema.prisma"] = process.argv;
const lines = readFileSync(src, "utf8").split("\n");

const result = [];
let i = 0;
while (i < lines.length) {
  const m = lines[i].match(/^model\s+(\w+)\s*\{/);
  if (!m) {
    result.push(lines[i].replace('provider = "sqlite"', 'provider = "mysql"').replace('provider = "postgresql"', 'provider = "mysql"'));
    i++;
    continue;
  }
  // zbierz cały model
  const block = [];
  while (i < lines.length) {
    block.push(lines[i]);
    if (lines[i].trim() === "}") break;
    i++;
  }
  i++;
  const keyFields = new Set();
  for (const l of block) {
    const t = l.trim();
    for (const mm of t.matchAll(/@@(?:index|unique|id)\(\[([^\]]+)\]/g)) mm[1].split(",").forEach((f) => keyFields.add(f.trim().replace(/\(.*$/, "")));
    for (const mm of t.matchAll(/fields:\s*\[([^\]]+)\]/g)) mm[1].split(",").forEach((f) => keyFields.add(f.trim()));
  }
  for (const l of block) {
    const f = l.match(/^(\s+)(\w+)(\s+)String(\??)(.*)$/);
    if (!f || l.includes("@db.")) {
      result.push(l);
      continue;
    }
    const [, ind, name, sp, opt, rest] = f;
    const attrs = rest.replace(/\/\/.*$/, "");
    const comment = rest.slice(attrs.length);
    let native = "";
    if (/@id\b/.test(attrs) || keyFields.has(name) || /@default\(/.test(attrs)) native = "";
    else if (/@unique\b/.test(attrs)) native = " @db.VarChar(255)";
    else native = MEDIUM.has(`${m[1]}.${name}`) ? " @db.MediumText" : " @db.Text";
    result.push(`${ind}${name}${sp}String${opt}${attrs.replace(/\s+$/, "")}${native}${comment ? " " + comment.trim() : ""}`);
  }
}
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, result.join("\n"));
console.log(`✔ Schemat MySQL/MariaDB: ${out}`);
