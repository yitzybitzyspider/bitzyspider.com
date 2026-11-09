// Minimal, safe Markdown for card bodies (D-025). Everything is HTML-escaped first, so the
// only tags in the output are the ones this file writes. Links allow http, https, mailto only.
(function (root) {
  "use strict";
  var ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;", "`": "&#96;" };
  function esc(s) { return String(s).replace(/[&<>"'`]/g, function (c) { return ESC[c]; }); }

  function safeUrl(u) {
    var raw = u.replace(/&amp;/g, "&").replace(/[\u0000- \u007f-\u009f]/g, "");
    return /^(https?:\/\/|mailto:)/i.test(raw) ? u.replace(/\s/g, "") : null;
  }

  function inline(s) {
    // s is already escaped. Pull code spans out first so nothing inside them is styled.
    var codes = [];
    s = s.replace(/&#96;([^\n]+?)&#96;/g, function (_, c) { codes.push(c); return "\u0001" + (codes.length - 1) + "\u0001"; });
    s = s.replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, function (m, text, url) {
      var ok = safeUrl(url);
      return ok ? '<a href="' + ok + '" target="_blank" rel="noopener noreferrer">' + text + "</a>" : text;
    });
    s = s.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, function (m, pre, url) {
      return pre + '<a href="' + url + '" target="_blank" rel="noopener noreferrer">' + url + "</a>";
    });
    s = s.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>").replace(/(^|[^*\w])\*([^*\n]+)\*(?!\w)/g, "$1<em>$2</em>");
    return s.replace(/\u0001(\d+)\u0001/g, function (_, i) { return "<code>" + codes[+i] + "</code>"; });
  }

  function render(md) {
    var lines = esc(md == null ? "" : md).replace(/\r\n?/g, "\n").replace(/\u0001/g, "").split("\n");
    var out = [], para = [], list = null, i, m;
    function flushPara() { if (para.length) { out.push("<p>" + inline(para.join("<br>")) + "</p>"); para = []; } }
    function flushList() { if (list) { out.push("</" + list + ">"); list = null; } }
    for (i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (/^&#96;&#96;&#96;/.test(line)) {
        flushPara(); flushList();
        var code = [];
        for (i++; i < lines.length && !/^&#96;&#96;&#96;/.test(lines[i]); i++) code.push(lines[i]);
        out.push("<pre><code>" + code.join("\n") + "</code></pre>");
      } else if ((m = /^(#{1,3})\s+(.*)$/.exec(line))) {
        flushPara(); flushList(); out.push("<h" + (m[1].length + 2) + ">" + inline(m[2]) + "</h" + (m[1].length + 2) + ">");
      } else if ((m = /^\s*([-*]|\d+[.)])\s+(.*)$/.exec(line))) {
        flushPara();
        var kind = /\d/.test(m[1]) ? "ol" : "ul";
        if (list !== kind) { flushList(); out.push("<" + kind + ">"); list = kind; }
        out.push("<li>" + inline(m[2]) + "</li>");
      } else if ((m = /^&gt;\s?(.*)$/.exec(line))) {
        flushPara(); flushList(); out.push("<blockquote>" + inline(m[1]) + "</blockquote>");
      } else if (/^\s*$/.test(line)) {
        flushPara(); flushList();
      } else { flushList(); para.push(line); }
    }
    flushPara(); flushList();
    return out.join("");
  }

  var api = { render: render, esc: esc };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.HQMarkdown = api;
})(typeof window !== "undefined" ? window : globalThis);
