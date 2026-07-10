#!/usr/bin/env node
import { mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";
import { execFileSync } from "node:child_process";

const args = process.argv.slice(2);
function arg(name, fallback) {
  const index = args.indexOf(name);
  return index === -1 ? fallback : args[index + 1];
}

const docsRoot = resolve(arg("--docs", "../after-effects-expression-reference"));
const outputRoot = resolve(arg("--output", "Scripts/verified/expressions/functions"));
let sha = arg("--sha", "");
if (!sha) {
  try { sha = execFileSync("git", ["-C", docsRoot, "rev-parse", "HEAD"], { encoding: "utf8" }).trim(); } catch {}
}
if (!sha) throw new Error("Could not determine source SHA; pass --sha <commit>.");

const PITFALLS = {
  loopIn: ["Requires at least two keyframes on the property."],
  loopInDuration: ["Requires at least two keyframes on the property."],
  loopOut: ["Requires at least two keyframes on the property."],
  loopOutDuration: ["Requires at least two keyframes on the property."],
  seedRandom: ["Pass timeless=true for static random values; otherwise results vary with time."],
  sourceRectAtTime: ["Repeated calls can be expensive; cache the returned rectangle within the expression."],
  sampleImage: ["Samples the layer render buffer and does not include adjustment layers above it."],
  posterizeTime: ["Affects evaluation after the call; place it before the expression result."],
};

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) files.push(...walk(path));
    else if (entry.endsWith(".md")) files.push(path);
  }
  return files;
}

function cleanMarkdown(value) {
  return value
    .replace(/`/g, "")
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
    .replace(/[*_]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function groupFor(path) {
  const rel = relative(join(docsRoot, "docs"), path).replace(/\\/g, "/");
  if (rel === "general/global.md") return "global";
  if (rel.includes("time-conversion")) return "time-conversion";
  if (rel.includes("vector-math") || rel.includes("other-math")) return "vector-math";
  if (rel.includes("random-numbers")) return "random";
  if (rel.includes("interpolation")) return "interpolation";
  if (rel.includes("color-conversion")) return "color-conversion";
  if (rel.includes("path-property")) return "path-property";
  if (rel.includes("camera") || rel.includes("light")) return "camera-light";
  if (rel.includes("footage")) return "footage";
  if (rel.includes("marker") || rel.endsWith("key.md")) return "marker-key";
  if (rel.startsWith("text/")) return "text";
  if (rel.includes("comp.md") || rel.includes("project.md")) return "comp";
  if (rel.startsWith("layer/")) return "layer";
  return "property";
}

function objectFor(path, heading, group) {
  const prefix = heading.match(/^([A-Za-z][A-Za-z0-9]*)\./);
  if (prefix) return prefix[1];
  if (group === "global" || ["time-conversion", "vector-math", "random", "interpolation", "color-conversion"].includes(group)) return "global";
  if (group === "layer") return "Layer";
  if (group === "text") return basename(path) === "style.md" ? "TextStyle" : "Text";
  if (group === "path-property") return "PathProperty";
  return "Property";
}

function getSection(segment, heading) {
  const marker = new RegExp("^####\\s+" + heading + "\\s*$", "im");
  const match = marker.exec(segment);
  if (!match) return "";
  const rest = segment.slice(match.index + match[0].length);
  const end = rest.search(/^####\s+|^###\s+|^---\s*$/m);
  return end === -1 ? rest : rest.slice(0, end);
}

function parseParamRows(section) {
  const rows = {};
  for (const line of section.split(/\r?\n/)) {
    const match = line.match(/^\|\s*`?([A-Za-z_$][\w$]*)`?\s*\|\s*([^|]+)\|\s*([^|]*)\|/);
    if (!match || /parameter/i.test(match[1])) continue;
    rows[match[1]] = { type: cleanMarkdown(match[2]), description: cleanMarkdown(match[3]) };
  }
  return rows;
}

function splitArgs(signature) {
  const open = signature.indexOf("(");
  const close = signature.lastIndexOf(")");
  if (open === -1 || close < open) return [];
  return signature.slice(open + 1, close).split(",").map((part) => part.trim()).filter(Boolean);
}

function extractRecords(path) {
  const content = readFileSync(path, "utf8");
  const headings = [];
  const re = /^###\s+(.+)$/gm;
  let match;
  while ((match = re.exec(content))) headings.push({ heading: match[1].trim(), start: match.index, body: re.lastIndex });
  const records = [];
  const group = groupFor(path);
  for (let i = 0; i < headings.length; i++) {
    const current = headings[i];
    const segment = content.slice(current.body, i + 1 < headings.length ? headings[i + 1].start : content.length);
    const signatureMatch = segment.match(/^\s*`([^`\n]*\([^`\n]*\))`\s*$/m);
    if (!signatureMatch && current.heading.indexOf("(") === -1) continue;
    const signature = cleanMarkdown(signatureMatch ? signatureMatch[1] : current.heading);
    const nameMatch = current.heading.match(/(?:^|\.)([A-Za-z_$][\w$]*)\s*\(/);
    if (!nameMatch) continue;
    const name = nameMatch[1];
    const object = objectFor(path, current.heading, group);
    const parameterSection = getSection(segment, "Parameters?");
    const paramRows = parseParamRows(parameterSection);
    const params = splitArgs(signature).map((raw) => {
      const optional = /^\[/.test(raw) || /=/.test(raw) || /optional/i.test(raw);
      const name = raw.replace(/[\[\]]/g, "").split("=")[0].trim().replace(/^\.\.\./, "");
      const row = paramRows[name] || {};
      return { name, type: row.type || "unknown", description: row.description || "", optional };
    });
    const returnsSection = getSection(segment, "Returns?");
    const returnsLine = returnsSection.split(/\r?\n/).map(cleanMarkdown).find(Boolean) || "unspecified";
    const exampleSection = getSection(segment, "Examples?:?");
    const exampleMatch = exampleSection.match(/```(?:js|javascript)?\s*\n([\s\S]*?)```/i);
    const versionMatch = segment.match(/added in After Effects\s+([0-9.]+)/i);
    const description = cleanMarkdown(getSection(segment, "Description")).slice(0, 240);
    const keywordSet = new Set([name.toLowerCase(), object.toLowerCase(), group.replace(/-/g, " ")]);
    for (const word of description.toLowerCase().match(/[a-z][a-z0-9-]{3,}/g) || []) keywordSet.add(word);
    records.push({
      name,
      object,
      signature,
      params,
      returns: returnsLine,
      appliesTo: object === "global" ? ["all expression properties"] : [object],
      minVersion: versionMatch ? versionMatch[1] : null,
      example: exampleMatch ? exampleMatch[1].trim() : "",
      pitfalls: PITFALLS[name] || [],
      keywords: Array.from(keywordSet).slice(0, 12),
      source: `docsforadobe/after-effects-expression-reference@${sha}:${relative(docsRoot, path).replace(/\\/g, "/")}`,
      verifiedAEVersion: null,
      verifiedEngines: [],
      verifiedStatus: "docs-sourced",
    });
  }
  return records;
}

const docsDir = join(docsRoot, "docs");
const byGroup = {};
for (const path of walk(docsDir).sort()) {
  if (path.includes(join("docs", "introduction")) || path.includes(join("docs", "_global"))) continue;
  for (const record of extractRecords(path)) {
    const group = groupFor(path);
    if (!byGroup[group]) byGroup[group] = [];
    const key = record.object + "." + record.name;
    const existing = byGroup[group].find((candidate) => candidate.object + "." + candidate.name === key);
    if (existing) {
      if (existing.signature !== record.signature) existing.signature += " | " + record.signature;
      continue;
    }
    byGroup[group].push(record);
  }
}

rmSync(outputRoot, { recursive: true, force: true });
mkdirSync(outputRoot, { recursive: true });
let total = 0;
for (const group of Object.keys(byGroup).sort()) {
  byGroup[group].sort((a, b) => (a.object + "." + a.name).localeCompare(b.object + "." + b.name));
  total += byGroup[group].length;
  writeFileSync(join(outputRoot, group + ".json"), JSON.stringify(byGroup[group], null, 2) + "\n");
}
writeFileSync(
  join(outputRoot, "_provenance.json"),
  JSON.stringify({ source: "docsforadobe/after-effects-expression-reference", commit: sha, license: "CC-BY-4.0", generatedRecords: total }, null, 2) + "\n"
);
console.log(`Parsed ${total} expression methods into ${Object.keys(byGroup).length} groups from ${sha}.`);
