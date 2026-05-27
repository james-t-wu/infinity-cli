/**
 * 命令实现入口 - 引用各个业务模块
 */

import fs from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import chalk from "chalk";
import {
  loadPage,
  savePage,
  projectPath,
  output,
  errorOut,
} from "./utils.js";

// 重新导出业务命令
export { heroGet, heroSet } from "./hero.js";
export {
  ventureList,
  ventureGet,
  ventureAdd,
  ventureUpdate,
  ventureRemove,
} from "./ventures.js";
export { dnaList, dnaAdd, dnaUpdate, dnaRemove } from "./dna.js";

const BACKUP_DIR_NAME = ".infinity-backups";

// ============ status ============
export async function cmdStatus(opts) {
  const projectDir = projectPath(opts);

  if (!existsSync(projectDir)) {
    errorOut(`Project directory not found: ${projectDir}`, null, opts.json);
  }

  const files = await fs.readdir(projectDir);
  const htmlFiles = files.filter((f) => f.endsWith(".html"));
  const isInfinityWeb = files.includes("AGENTS.md");

  let currentTitle = null;
  let ventureCount = 0;
  let dnaCount = 0;

  if (htmlFiles.includes("index.html")) {
    const { $ } = await loadPage(opts);
    currentTitle = $("title").text();
    ventureCount = $(".ventures-grid > .venture-card").length;
    dnaCount = $(".dna-grid > .dna-card").length;
  }

  const data = {
    success: true,
    project_dir: projectDir,
    is_infinity_web: isInfinityWeb,
    pages: htmlFiles.map((f) => f.replace(".html", "")),
    current_title: currentTitle,
    sections: { ventures: ventureCount, dna_cards: dnaCount },
  };

  if (opts.json) {
    output(data, true);
  } else {
    console.log(chalk.bold("\nProject Status"));
    console.log(`  Directory:    ${chalk.cyan(data.project_dir)}`);
    if (!isInfinityWeb) {
      console.log(chalk.yellow(`  ⚠ AGENTS.md not found`));
    }
    console.log(`  Pages:        ${data.pages.join(", ") || "(none)"}`);
    console.log(`  Title:        ${data.current_title || "(n/a)"}`);
    console.log(`  Ventures:     ${ventureCount}`);
    console.log(`  DNA cards:    ${dnaCount}\n`);
  }
}

// ============ title ============
export async function cmdTitle(opts) {
  const { $, filepath } = await loadPage(opts, opts.page);

  if (opts.action === "get") {
    output({ success: true, page: opts.page, title: $("title").text() }, opts.json);
    return;
  }

  $("title").text(opts.value);
  await savePage($, filepath);
  output({
    success: true,
    message: chalk.green(`✓ Title updated to: ${opts.value}`),
    page: opts.page,
    title: opts.value,
  }, opts.json);
}

// ============ page ============
export async function cmdPage(opts) {
  const projectDir = projectPath(opts);
  const files = await fs.readdir(projectDir);
  const pages = files.filter((f) => f.endsWith(".html")).map((f) => f.replace(".html", ""));

  if (opts.action === "list") {
    output({ success: true, pages, items: pages.map((name) => ({ name })) }, opts.json);
    return;
  }
}

// ============ content (通用兜底) ============
export async function cmdContent(opts) {
  const { $, filepath } = await loadPage(opts, opts.page);
  const target = $(opts.selector);

  if (target.length === 0) {
    errorOut(
      `Selector "${opts.selector}" matched no elements in ${opts.page}.html`,
      "Verify your selector. Try 'infinity preview' to inspect.",
      opts.json
    );
  }

  if (opts.action === "get") {
    output({
      success: true,
      page: opts.page,
      selector: opts.selector,
      text: target.first().text(),
      match_count: target.length,
    }, opts.json);
    return;
  }

  if (opts.action === "set") {
    target.text(opts.text);
    await savePage($, filepath);
    output({
      success: true,
      message: chalk.green(`✓ Updated ${target.length} element(s) in ${opts.page}.html`),
      page: opts.page,
      selector: opts.selector,
      new_text: opts.text,
    }, opts.json);
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
    if (stat.isFile() && /\.(html|css|js|json|md)$/.test(f)) {
      await fs.copyFile(src, path.join(target, f));
      copied++;
    }
  }

  if (opts.message) {
    await fs.writeFile(path.join(target, ".message"), opts.message);
  }

  output({
    success: true,
    message: chalk.green(`✓ Backup created: ${id} (${copied} files)`),
    backup_id: id,
    files_count: copied,
  }, opts.json);
}

// ============ restore ============
export async function cmdRestore(opts) {
  const backupDir = projectPath(opts, BACKUP_DIR_NAME, opts.id);
  if (!existsSync(backupDir)) {
    errorOut(`Backup "${opts.id}" not found`, `Run 'infinity history' to see available backups.`, opts.json);
  }
  const files = await fs.readdir(backupDir);
  let restored = 0;
  for (const f of files) {
    if (f === ".message") continue;
    await fs.copyFile(path.join(backupDir, f), projectPath(opts, f));
    restored++;
  }
  output({
    success: true,
    message: chalk.green(`✓ Restored from backup: ${opts.id} (${restored} files)`),
    backup_id: opts.id,
  }, opts.json);
}

// ============ history ============
export async function cmdHistory(opts) {
  const backupDir = projectPath(opts, BACKUP_DIR_NAME);
  if (!existsSync(backupDir)) {
    output({ success: true, backups: [], message: "No backups yet" }, opts.json);
    return;
  }
  const backups = (await fs.readdir(backupDir)).sort().reverse();

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
  output({
    success: true,
    message: `To preview, run in a new terminal:\n  cd ${projectDir}\n  python3 -m http.server ${port}\n\nThen open: http://localhost:${port}`,
    url: `http://localhost:${port}`,
  }, opts.json);
}
