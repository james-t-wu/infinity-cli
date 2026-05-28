#!/usr/bin/env node
/**
 * infinity CLI - AI-friendly editor for the infinity-web project
 *
 * Stage 2.5: 加入自动版本检查
 */

import { Command } from "commander";
import chalk from "chalk";
import { readFile } from "fs/promises";
import { fileURLToPath } from "url";
import path from "path";

import {
  cmdStatus,
  cmdTitle,
  cmdPage,
  cmdContent,
  cmdBackup,
  cmdRestore,
  cmdHistory,
  cmdPreview,
  heroGet,
  heroSet,
  ventureList,
  ventureGet,
  ventureAdd,
  ventureUpdate,
  ventureRemove,
  dnaList,
  dnaAdd,
  dnaUpdate,
  dnaRemove,
} from "../src/commands.js";

import { checkForUpdate, printUpdateNotice } from "../src/version-check.js";

// ============ 读取本 CLI 的版本号 ============
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgPath = path.join(__dirname, "..", "package.json");
const pkg = JSON.parse(await readFile(pkgPath, "utf-8"));
const CURRENT_VERSION = pkg.version;

// ============ 后台异步检查更新(不阻塞主流程) ============
// 注意:这是 fire-and-forget 模式,Promise 自己跑完
const updateCheckPromise = checkForUpdate(CURRENT_VERSION);

// 程序结束前,如果检查完成了,打印提示
// 用 process.on('exit') 不行(异步操作不会被等),用一个小技巧:
async function printUpdateIfReady() {
  // 给检查最多 2 秒,超时就不等了
  const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 2000));
  const result = await Promise.race([updateCheckPromise, timeoutPromise]);
  printUpdateNotice(result);
}

// ============ 主程序 ============
const program = new Command();

program
  .name("infinity")
  .description("CLI for editing the infinity-web project")
  .version(CURRENT_VERSION)
  .option("--json", "Output as JSON (for AI agents)")
  .option("--project <path>", "Project directory", ".")
  .option("--no-update-check", "Skip version check (for CI/scripts)");

// ============ status ============
program
  .command("status")
  .description("Show project status. Agents should call this first!")
  .action(() => cmdStatus(program.opts()));

// ============ title ============
const title = program.command("title").description("Manage page title");
title.command("get")
  .option("--page <page>", "Which page", "index")
  .description("Get current page title")
  .action((opts) => cmdTitle({ ...program.opts(), ...opts, action: "get" }));
title.command("set <newTitle>")
  .option("--page <page>", "Which page", "index")
  .description("Set new page title")
  .action((newTitle, opts) =>
    cmdTitle({ ...program.opts(), ...opts, action: "set", value: newTitle })
  );

// ============ hero ============
const hero = program.command("hero").description("Manage the hero section");
hero.command("get")
  .description("Get current hero content")
  .action(() => heroGet(program.opts()));
hero.command("set")
  .description("Update hero content (any field optional)")
  .option("--tagline <text>", "Top tagline (h2)")
  .option("--title <text>", "Main title (h1)")
  .option("--subtitle <text>", "Bottom subtitle (p)")
  .action((opts) => heroSet({ ...program.opts(), ...opts }));

// ============ venture ============
const venture = program.command("venture").description("Manage ventures (subsidiary cards)");
venture.command("list")
  .description("List all ventures")
  .action(() => ventureList(program.opts()));
venture.command("get <name>")
  .description("Get details of a venture by name")
  .action((name) => ventureGet({ ...program.opts(), name }));
venture.command("add")
  .description("Add a new venture")
  .requiredOption("--name <name>", "Venture name (required)")
  .option("--desc <text>", "Description")
  .option("--url <url>", "Learn-more URL")
  .option("--logo <url>", "Logo image URL")
  .action((opts) => ventureAdd({ ...program.opts(), ...opts }));
venture.command("update <name>")
  .description("Update a venture (any field optional)")
  .option("--new-name <name>", "Rename the venture")
  .option("--desc <text>", "Update description")
  .option("--url <url>", "Update URL")
  .option("--logo <url>", "Update logo URL")
  .action((name, opts) =>
    ventureUpdate({ ...program.opts(), ...opts, name })
  );
venture.command("remove <name>")
  .description("Remove a venture")
  .action((name) => ventureRemove({ ...program.opts(), name }));

// ============ dna ============
const dna = program.command("dna").description("Manage DNA achievement cards");
dna.command("list")
  .description("List all DNA cards")
  .action(() => dnaList(program.opts()));
dna.command("add")
  .description("Add a new DNA card")
  .requiredOption("--title <title>", "Card title (required)")
  .option("--desc <text>", "Description")
  .option("--icon <class>", "Font Awesome class, e.g. 'fas fa-star'", "fas fa-star")
  .action((opts) => dnaAdd({ ...program.opts(), ...opts }));
dna.command("update <title>")
  .description("Update a DNA card (any field optional)")
  .option("--new-title <title>", "Rename")
  .option("--desc <text>", "Update description")
  .option("--icon <class>", "Update icon class")
  .action((title, opts) =>
    dnaUpdate({ ...program.opts(), ...opts, title })
  );
dna.command("remove <title>")
  .description("Remove a DNA card")
  .action((title) => dnaRemove({ ...program.opts(), title }));

// ============ content ============
const content = program.command("content").description("Edit text via CSS selector (fallback)");
content.command("set <selector> <text>")
  .description("Update text. Use this when no specific command fits.")
  .option("--page <page>", "Which page", "index")
  .action((selector, text, opts) =>
    cmdContent({ ...program.opts(), ...opts, action: "set", selector, text })
  );
content.command("get <selector>")
  .description("Get text from element")
  .option("--page <page>", "Which page", "index")
  .action((selector, opts) =>
    cmdContent({ ...program.opts(), ...opts, action: "get", selector })
  );

// ============ page list ============
const page = program.command("page").description("List pages");
page.command("list").action(() => cmdPage({ ...program.opts(), action: "list" }));

// ============ backup / restore / history ============
program
  .command("backup")
  .description("Snapshot current state (use before risky changes)")
  .option("--message <msg>", "Backup message")
  .action((opts) => cmdBackup({ ...program.opts(), ...opts }));

program
  .command("restore <id>")
  .description("Restore from a backup")
  .action((id) => cmdRestore({ ...program.opts(), id }));

program
  .command("history")
  .description("List all backups (newest first)")
  .action(() => cmdHistory(program.opts()));

// ============ preview ============
program
  .command("preview")
  .description("Show how to preview the site locally")
  .option("--port <port>", "Port", "8080")
  .action((opts) => cmdPreview({ ...program.opts(), ...opts }));

// ============ check-update (手动触发) ============
program
  .command("check-update")
  .description("Manually check for updates")
  .action(async () => {
    console.log(chalk.gray(`Current version: ${CURRENT_VERSION}`));
    console.log(chalk.gray("Checking GitHub for latest release..."));
    const result = await checkForUpdate(CURRENT_VERSION);
    if (!result) {
      console.log(chalk.red("Failed to check (no network or repo not found)"));
      return;
    }
    if (result.hasUpdate) {
      printUpdateNotice(result);
    } else {
      console.log(chalk.green(`✓ You're on the latest version (${CURRENT_VERSION})`));
    }
  });

// ============ help ============
program.addHelpText("after", `
${chalk.bold("Examples:")}
  ${chalk.gray("# Always check status first")}
  $ infinity status

  ${chalk.gray("# Hero section")}
  $ infinity hero set --tagline "新口号" --subtitle "since 1993"

  ${chalk.gray("# Ventures")}
  $ infinity venture list
  $ infinity venture add --name "New Co" --desc "..." --url "..." --logo "..."
  $ infinity venture update "Infinity Medical" --desc "新描述"

  ${chalk.gray("# DNA cards")}
  $ infinity dna add --title "新成就" --desc "..." --icon "fas fa-trophy"

  ${chalk.gray("# Safety: backup before risky changes")}
  $ infinity backup --message "before redesign"
  $ infinity restore <id>

  ${chalk.gray("# Manually check for updates")}
  $ infinity check-update

${chalk.bold("For AI Agents:")}
  Read AGENTS.md in the project root.
  Always run 'infinity status' first.
`);

// ============ 解析 + 收尾 ============
try {
  await program.parseAsync(process.argv);
} catch (err) {
  console.error(chalk.red("Error:"), err.message);
  // 出错也要尝试打印升级提示
  await printUpdateIfReady();
  process.exit(1);
}

// 主命令完成后,打印升级提示(如果有的话)
// 但如果是 --json 模式,不打印(避免污染输出)
if (!program.opts().json) {
  await printUpdateIfReady();
}
