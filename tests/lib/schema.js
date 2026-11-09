// Reads supabase/migrations/*.sql and answers questions about the schema they produce:
// function signatures, table columns, allowed enum values, who may execute what.
"use strict";
const fs = require("fs"), path = require("path");

function load(dir) {
  const files = fs.readdirSync(dir).filter(f => /^\d{4}_.+\.sql$/.test(f)).sort();
  const sql = files.map(f => fs.readFileSync(path.join(dir, f), "utf8").replace(/--.*$/gm, "")).join("\n");
  const s = { files, functions: {}, tables: {}, views: [], checks: {}, exec: {} };

  let m;
  const fn = /create\s+(?:or\s+replace\s+)?function\s+public\.(\w+)\s*\(([^)]*)\)/gi;
  while ((m = fn.exec(sql))) {
    const params = m[2].split(",").map(x => x.trim()).filter(Boolean).map(p => {
      const w = p.split(/\s+/); return { name: w[0], type: w[1], optional: /\bdefault\b/i.test(p) };
    });
    s.functions[m[1]] = params;      // later definitions replace earlier ones
  }
  const drop = /drop\s+function\s+public\.(\w+)/gi;   // a drop followed by a create is already handled by order
  void drop;

  const tb = /create\s+table\s+public\.(\w+)\s*\(([\s\S]*?)\n\);/gi;
  while ((m = tb.exec(sql))) {
    s.tables[m[1]] = m[2].split("\n").map(l => l.trim()).filter(l => /^[a-z_]+\s+(text|bigint|jsonb|numeric|timestamptz|boolean|int|interval)\b/i.test(l)).map(l => l.split(/\s+/)[0]);
  }
  const ac = /alter\s+table\s+public\.(\w+)\s+add\s+column\s+(\w+)/gi;
  while ((m = ac.exec(sql))) (s.tables[m[1]] = s.tables[m[1]] || []).push(m[2]);
  const vw = /create\s+view\s+public\.(\w+)/gi;
  while ((m = vw.exec(sql))) if (!s.views.includes(m[1])) s.views.push(m[1]);

  // Allowed values: the last "check (col in (...))" seen for each table.column wins.
  const named = /alter\s+table\s+public\.(\w+)\s+add\s+constraint\s+\w+\s+check\s*\(\s*(\w+)\s+in\s*\(([^)]*)\)/gi;
  const inline = /create\s+table\s+public\.(\w+)\s*\(([\s\S]*?)\n\);/gi;
  while ((m = inline.exec(sql))) {
    const re = /(\w+)\s+text[^,]*?check\s*\(\s*\1\s+in\s*\(([^)]*)\)/gi; let c;
    while ((c = re.exec(m[2]))) s.checks[m[1] + "." + c[1]] = c[2].match(/'([^']*)'/g).map(x => x.slice(1, -1));
  }
  while ((m = named.exec(sql))) s.checks[m[1] + "." + m[2]] = m[3].match(/'([^']*)'/g).map(x => x.slice(1, -1));

  // Execute rights, replayed in order. Supabase starts every function open to all three roles.
  const stmt = /(grant\s+execute|revoke\s+all)\s+on\s+function\s+([\s\S]*?)\s+(to|from)\s+([\w,\s]+?);/gi;
  Object.keys(s.functions).forEach(f => { s.exec[f] = new Set(["anon", "authenticated", "service_role"]); });
  while ((m = stmt.exec(sql))) {
    const names = (m[2].match(/public\.(\w+)/g) || []).map(x => x.slice(7)), roles = m[4].split(",").map(x => x.trim());
    names.forEach(f => { if (!s.exec[f]) return; roles.forEach(r => { if (/grant/i.test(m[1])) s.exec[f].add(r); else if (r !== "public") s.exec[f].delete(r); }); });
  }
  return s;
}
module.exports = { load };
