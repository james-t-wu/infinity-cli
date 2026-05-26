#!/usr/bin/env node
/**
 * infinity CLI - AI-friendly editor for the infinity-web project
 *
 * 设计原则:
 * 1. 每个命令做一件清楚的事
 * 2. 支持 --json 输出,方便 Agent 解析
 * 3. 错误信息要 actionable (告诉用户怎么修复)
 * 4. 操作前自动备份,可以回滚
 */

import { Command } from "commander";
import chalk from "chalk";
import {
  cmdStatus,
  cmdTitle,
  cmdTheme,
  cmdPage,
  cmdContent,
  cmdStyle,
  cmdBackup,
  cmdRestore,
  cmdHistory,
  cmdPreview,
} from "../src/commands.js";

const program = new Command();

program
  .name("infinity")
  .description("CLI for editing the infinity-web project")
  .version("0.1.0")
  .option("--json", "Output as JSON (for AI agents and scripts)")
  .option("--project <path>", "Project directory (default: current)", ".");

// ============ status ============
program
  .command("status")
  .description("Show project status. Agents should call this first!")
  .action(() => cmdStatus(program.opts()));

// ============ title ============
const title = program.command("title").description("Manage page title");
title
  .command("get")
  .option("--page <page>", "Which page (default: index)", "index")
  .description("Get current page title")
  .action((opts) => cmdTitle({ ...program.opts(), ...opts, action: "get" }));
title
  .command("set <newTitle>")
  .option("--page <page>", "Which page (default: index)", "index")
  .description("Set new page title")
  .action((newTitle, opts) =>
    cmdTitle({ ...program.opts(), ...opts, action: "set", value: newTitle })
  );

// ============ theme ============
const theme = program.command("theme").description("Manage site theme/colors");
theme
  .command("list")
  .description("List available themes")
  .action(() => cmdTheme({ ...program.opts(), action: "list" }));
theme
  .command("get")
  .description("Get current theme")
  .action(() => cmdTheme({ ...program.opts(), action: "get" }));
theme
  .command("set <name>")
  .description("Apply a theme (light | dark | blue | green | warm)")
  .action((name) =>
    cmdTheme({ ...program.opts(), action: "set", value: name })
  );

// ============ page ============
const page = program.command("page").description("Manage pages");
page
  .command("list")
  .description("List all pages")
  .action(() => cmdPage({ ...program.opts(), action: "list" }));
page
  .command("new <name>")
  .description("Create a new page (copies index.html as template)")
  .option("--title <title>", "Page title")
  .action((name, opts) =>
    cmdPage({ ...program.opts(), ...opts, action: "new", name })
  );

// ============ content ============
const content = program
  .command("content")
  .description("Edit text content via CSS selector");
content
  .command("set <selector> <text>")
  .description("Update text. selector: CSS selector, e.g. 'h1.hero-title'")
  .option("--page <page>", "Which page (default: index)", "index")
  .action((selector, text, opts) =>
    cmdContent({
      ...program.opts(),
      ...opts,
      action: "set",
      selector,
      text,
    })
  );
content
  .command("get <selector>")
  .description("Get text from element")
  .option("--page <page>", "Which page (default: index)", "index")
  .action((selector, opts) =>
    cmdContent({ ...program.opts(), ...opts, action: "get", selector })
  );

// ============ style ============
const style = program.command("style").description("Modify CSS styles");
style
  .command("set <selector> <property> <value>")
  .description("Set a CSS rule. e.g. style set body background '#fff'")
  .action((selector, property, value) =>
    cmdStyle({
      ...program.opts(),
      action: "set",
      selector,
      property,
      value,
    })
  );
style
  .command("get <selector>")
  .description("Get CSS rules for a selector")
  .action((selector) =>
    cmdStyle({ ...program.opts(), action: "get", selector })
  );

// ============ backup / restore / history ============
program
  .command("backup")
  .description("Create a snapshot of current state (use before risky changes)")
  .option("--message <msg>", "Backup message")
  .action((opts) => cmdBackup({ ...program.opts(), ...opts }));

program
  .command("restore <id>")
  .description("Restore from a backup")
  .action((id) => cmdRestore({ ...program.opts(), id }));

program
  .command("history")
  .description("List all backups (sorted newest first)")
  .action(() => cmdHistory(program.opts()));

// ============ preview ============
program
  .command("preview")
  .description("Show how to preview the site locally")
  .option("--port <port>", "Port (default: 8080)", "8080")
  .action((opts) => cmdPreview({ ...program.opts(), ...opts }));

// ============ help with examples ============
program.addHelpText(
  "after",
  `
${chalk.bold("Examples:")}
  ${chalk.gray("# Always start with status")}
  $ infinity status

  ${chalk.gray("# Quick text changes")}
  $ infinity title set "新标题"
  $ infinity content set "h1.hero-title" "欢迎"
  $ infinity content set ".phone" "400-xxx-xxxx"

  ${chalk.gray("# Theme")}
  $ infinity theme list
  $ infinity theme set dark

  ${chalk.gray("# Safety: backup before risky changes")}
  $ infinity backup --message "before redesign"
  $ infinity restore 2026-05-25T10-30-00

  ${chalk.gray("# JSON output (for AI agents)")}
  $ infinity page list --json
  $ infinity content get "h1" --json

${chalk.bold("For AI Agents:")}
  Read AGENTS.md in the project root for usage guidelines.
  Always run 'infinity status' first to understand current state.
`
);

program.parseAsync(process.argv).catch((err) => {
  console.error(chalk.red("Error:"), err.message);
  process.exit(1);
});
