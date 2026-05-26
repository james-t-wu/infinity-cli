/**
 * infinity CLI 命令实现
 * 所有命令都支持 --json 模式
 */

import fs from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import * as cheerio from "cheerio";
import chalk from "chalk";

const BACKUP_DIR_NAME = ".infinity-backups";

// ============ 输出工具 ============
function output(data, jsonMode) {
  if (jsonMode) {
    console.log(JSON.stringify(data, null, 2));
  } else {
    if (data.message) console.log(data.message);
    if (data.items) {
      data.items.forEach((item) => {
        console.log(`  ${chalk.cyan(item.name || item)}`);
      });
    }
  }
}

function errorOut(message, hint, jsonMode) {
  const data = { success: false, error: message };
  if (hint) data.hint = hint;
  if (jsonMode) {
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.error(chalk.red("Error:"), message);
    if (hint) console.error(chalk.gray("Hint:"), hint);
  }
  process.exit(1);
}

// ============ Helpers ============
function projectPath(opts, ...parts) {
  return path.resolve(opts.project || ".", ...parts);
}

async function readHtml(opts, pageName = "index") {
  const filepath = projectPath(opts, `${pageName}.html`);
  if (!existsSync(filepath)) {
    errorOut(
      `Page "${pageName}" not found`,
      `Run 'infinity page list' to see available pages.`,
      opts.json
    );
  }
  return await fs.readFile(filepath, "utf-8");
}

async function writeHtml(opts, html, pageName = "index") {
  const filepath = projectPath(opts, `${pageName}.html`);
  await fs.writeFile(filepath, html, "utf-8");
}

// ============ status ============
export async function cmdStatus(opts) {
  const projectDir = projectPath(opts);

  if (!existsSync(projectDir)) {
    errorOut(`Project directory not found: ${projectDir}`, null, opts.json);
  }

  const files = await fs.readdir(projectDir);
  const htmlFiles = files.filter((f) => f.endsWith(".html"));
  const cssFiles = files.filter((f) => f.endsWith(".css"));
  const jsFiles = files.filter((f) => f.endsWith(".js"));

  let currentTitle = null;
  if (htmlFiles.includes("index.html")) {
    const html = await readHtml(opts);
    const $ = cheerio.load(html);
    currentTitle = $("title").text();
  }

  const isInfinityWeb = files.includes("AGENTS.md");

  const data = {
    success: true,
    project_dir: projectDir,
    is_infinity_web: isInfinityWeb,
    pages: htmlFiles.map((f) => f.replace(".html", "")),
    css_files: cssFiles,
    js_files: jsFiles,
    current_title: currentTitle,
  };

  if (opts.json) {
    output(data, true);
  } else {
    console.log(chalk.bold("\nProject Status"));
    console.log(`  Directory:  ${chalk.cyan(data.project_dir)}`);
    if (!isInfinityWeb) {
      console.log(
        chalk.yellow(`  ⚠ AGENTS.md not found - may not be infinity-web`)
      );
    }
    console.log(
      `  Pages:      ${data.pages.join(", ") || "(none)"}`
    );
    console.log(`  CSS files:  ${data.css_files.join(", ") || "(none)"}`);
    console.log(`  JS files:   ${data.js_files.join(", ") || "(none)"}`);
    console.log(`  Title:      ${data.current_title || "(no index.html)"}\n`);
  }
}

// ============ title ============
export async function cmdTitle(opts) {
  const html = await readHtml(opts, opts.page);
  const $ = cheerio.load(html);

  if (opts.action === "get") {
    const t = $("title").text();
    output({ success: true, page: opts.page, title: t }, opts.json);
    return;
  }

  $("title").text(opts.value);
  await writeHtml(opts, $.html(), opts.page);
  output(
    {
      success: true,
      message: chalk.green(`✓ Title updated to: ${opts.value}`),
      page: opts.page,
      title: opts.value,
    },
    opts.json
  );
}

// ============ theme ============
const THEMES = {
  light: { bg: "#ffffff", text: "#333333", accent: "#0066cc" },
  dark: { bg: "#1a1a1a", text: "#e0e0e0", accent: "#4d9eff" },
  blue: { bg: "#f0f7ff", text: "#1a3a5c", accent: "#0066cc" },
  green: { bg: "#f0fff4", text: "#1a3a2c", accent: "#00875a" },
  warm: { bg: "#fff8f0", text: "#3a2a1a", accent: "#cc6633" },
};

export async function cmdTheme(opts) {
  if (opts.action === "list") {
    output(
      {
        success: true,
        themes: Object.keys(THEMES),
        items: Object.keys(THEMES).map((name) => ({ name })),
      },
      opts.json
    );
    return;
  }

  if (opts.action === "get") {
    // 简单实现:检查 style.css 里是否标记了 theme
    const cssPath = projectPath(opts, "style.css");
    let theme = "unknown";
    if (existsSync(cssPath)) {
      const css = await fs.readFile(cssPath, "utf-8");
      const m = css.match(/\/\* theme: (\w+) \*\//);
      if (m) theme = m[1];
    }
    output({ success: true, theme }, opts.json);
    return;
  }

  if (opts.action === "set") {
    if (!THEMES[opts.value]) {
      errorOut(
        `Unknown theme: ${opts.value}`,
        `Available: ${Object.keys(THEMES).join(", ")}`,
        opts.json
      );
    }
    const t = THEMES[opts.value];
    const cssPath = projectPath(opts, "style.css");
    let css = existsSync(cssPath) ? await fs.readFile(cssPath, "utf-8") : "";

    // 移除已有的 theme block,加新的
    css = css.replace(/\/\* theme:.*?\*\/[\s\S]*?(?=\n\n|\n[^ \t]|$)/g, "").trim();
    const themeBlock = `/* theme: ${opts.value} */
body {
  background: ${t.bg};
  color: ${t.text};
}
a, .accent { color: ${t.accent}; }
`;
    css = themeBlock + "\n\n" + css;
    await fs.writeFile(cssPath, css);
    output(
      {
        success: true,
        message: chalk.green(`✓ Theme applied: ${opts.value}`),
        theme: opts.value,
      },
      opts.json
    );
  }
}

// ============ page ============
export async function cmdPage(opts) {
  const projectDir = projectPath(opts);
  const files = await fs.readdir(projectDir);
  const pages = files
    .filter((f) => f.endsWith(".html"))
    .map((f) => f.replace(".html", ""));

  if (opts.action === "list") {
    output(
      {
        success: true,
        pages,
        items: pages.map((name) => ({ name })),
      },
      opts.json
    );
    return;
  }

  if (opts.action === "new") {
    const target = projectPath(opts, `${opts.name}.html`);
    if (existsSync(target)) {
      errorOut(
        `Page "${opts.name}" already exists`,
        `Pick a different name, or edit the existing page.`,
        opts.json
      );
    }
    // 用 index 作为模板
    const indexPath = projectPath(opts, "index.html");
    if (!existsSync(indexPath)) {
      errorOut("No index.html as template", null, opts.json);
    }
    const tpl = await fs.readFile(indexPath, "utf-8");
    const $ = cheerio.load(tpl);
    $("title").text(opts.title || opts.name);
    // 清空 body 主要内容,只留结构
    $("body").html(
      `<h1 class="hero-title">${opts.title || opts.name}</h1>\n  <p>This is the ${opts.name} page.</p>\n  <script src="script.js"></script>`
    );
    await fs.writeFile(target, $.html());
    output(
      {
        success: true,
        message: chalk.green(`✓ Page "${opts.name}" created`),
        page: opts.name,
      },
      opts.json
    );
  }
}

// ============ content ============
export async function cmdContent(opts) {
  const html = await readHtml(opts, opts.page);
  const $ = cheerio.load(html);
  const target = $(opts.selector);

  if (target.length === 0) {
    errorOut(
      `Selector "${opts.selector}" matched no elements in ${opts.page}.html`,
      `Verify your selector. Try 'infinity preview' to inspect the page in browser.`,
      opts.json
    );
  }

  if (opts.action === "get") {
    output(
      {
        success: true,
        page: opts.page,
        selector: opts.selector,
        text: target.first().text(),
        match_count: target.length,
      },
      opts.json
    );
    return;
  }

  if (opts.action === "set") {
    target.text(opts.text);
    await writeHtml(opts, $.html(), opts.page);
    output(
      {
        success: true,
        message: chalk.green(
          `✓ Updated ${target.length} element(s) in ${opts.page}.html`
        ),
        page: opts.page,
        selector: opts.selector,
        new_text: opts.text,
      },
      opts.json
    );
  }
}

// ============ style ============
export async function cmdStyle(opts) {
  const cssPath = projectPath(opts, "style.css");
  let css = existsSync(cssPath) ? await fs.readFile(cssPath, "utf-8") : "";

  if (opts.action === "set") {
    css += `\n${opts.selector} { ${opts.property}: ${opts.value}; }\n`;
    await fs.writeFile(cssPath, css);
    output(
      {
        success: true,
        message: chalk.green("✓ Style rule added"),
        rule: `${opts.selector} { ${opts.property}: ${opts.value} }`,
      },
      opts.json
    );
    return;
  }

  if (opts.action === "get") {
    const safeSelector = opts.selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`${safeSelector}\\s*\\{([^}]*)\\}`, "g");
    const matches = [...css.matchAll(regex)].map((m) => m[1].trim());
    output(
      { success: true, selector: opts.selector, rules: matches },
      opts.json
    );
  }
}

// ============ backup ============
export async function cmdBackup(opts) {
  const backupDir = projectPath(opts, BACKUP_DIR_NAME);
  await fs.mkdir(backupDir, { recursive: true });

  const id = new Date().toISOString().replace(/[:.]/g, "-");
  const target = path.join(backupDir, id);
  await fs.mkdir(target, { recursive: true });

  const files = await fs.readdir(projectPath(opts));
  let copied = 0;
  for (const f of files) {
    if (f.startsWith(".") || f === "node_modules") continue;
    const src = projectPath(opts, f);
    const stat = await fs.stat(src);
    if (stat.isFile()) {
      await fs.copyFile(src, path.join(target, f));
      copied++;
    }
  }

  if (opts.message) {
    await fs.writeFile(path.join(target, ".message"), opts.message);
  }

  output(
    {
      success: true,
      message: chalk.green(`✓ Backup created: ${id} (${copied} files)`),
      backup_id: id,
      files_count: copied,
    },
    opts.json
  );
}

// ============ restore ============
export async function cmdRestore(opts) {
  const backupDir = projectPath(opts, BACKUP_DIR_NAME, opts.id);
  if (!existsSync(backupDir)) {
    errorOut(
      `Backup "${opts.id}" not found`,
      `Run 'infinity history' to see available backups.`,
      opts.json
    );
  }
  const files = await fs.readdir(backupDir);
  let restored = 0;
  for (const f of files) {
    if (f === ".message") continue;
    await fs.copyFile(path.join(backupDir, f), projectPath(opts, f));
    restored++;
  }
  output(
    {
      success: true,
      message: chalk.green(`✓ Restored from backup: ${opts.id} (${restored} files)`),
      backup_id: opts.id,
    },
    opts.json
  );
}

// ============ history ============
export async function cmdHistory(opts) {
  const backupDir = projectPath(opts, BACKUP_DIR_NAME);
  if (!existsSync(backupDir)) {
    output(
      { success: true, backups: [], message: "No backups yet" },
      opts.json
    );
    return;
  }
  const backups = (await fs.readdir(backupDir)).sort().reverse();

  // 读每个 backup 的 message
  const details = await Promise.all(
    backups.map(async (id) => {
      const msgPath = path.join(backupDir, id, ".message");
      const message = existsSync(msgPath)
        ? await fs.readFile(msgPath, "utf-8")
        : "(no message)";
      return { id, message };
    })
  );

  if (opts.json) {
    output({ success: true, backups: details }, true);
  } else {
    console.log(chalk.bold("\nBackup History (newest first):"));
    details.forEach((b) => {
      console.log(`  ${chalk.cyan(b.id)}  ${chalk.gray(b.message)}`);
    });
    console.log();
  }
}

// ============ preview ============
export async function cmdPreview(opts) {
  const port = opts.port || "8080";
  const projectDir = projectPath(opts);
  output(
    {
      success: true,
      message: `To preview, run in a new terminal:\n  cd ${projectDir}\n  python3 -m http.server ${port}\n\nThen open: http://localhost:${port}`,
      url: `http://localhost:${port}`,
    },
    opts.json
  );
}
