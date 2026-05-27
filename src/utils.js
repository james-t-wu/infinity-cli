/**
 * 公共工具函数 - 所有命令都会用到
 *
 * 学习点:把重复的逻辑抽出来,后面再加命令就不用复制粘贴
 */

import fs from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import * as cheerio from "cheerio";
import chalk from "chalk";

// ============ 输出工具 ============

/**
 * 统一输出函数。
 * jsonMode: true → 输出 JSON(给 Agent 看)
 * jsonMode: false → 输出彩色文字(给人看)
 */
export function output(data, jsonMode) {
  if (jsonMode) {
    console.log(JSON.stringify(data, null, 2));
  } else {
    if (data.message) console.log(data.message);
    if (data.items) {
      data.items.forEach((item) => {
        const display = item.name || item.title || item;
        console.log(`  ${chalk.cyan(display)}`);
        if (item.description) {
          console.log(`    ${chalk.gray(item.description)}`);
        }
      });
    }
  }
}

/**
 * 错误退出。Agent 友好的错误信息要包含 hint
 */
export function errorOut(message, hint, jsonMode) {
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

// ============ 文件操作 ============

/**
 * 构造项目内的绝对路径
 */
export function projectPath(opts, ...parts) {
  return path.resolve(opts.project || ".", ...parts);
}

/**
 * 读取一个 HTML 页面,返回 cheerio 实例 $
 *
 * 用法:
 *   const { $, filepath } = await loadPage(opts, "index");
 *   $("h1").text("New");
 *   await savePage($, filepath);
 */
export async function loadPage(opts, pageName = "index") {
  const filepath = projectPath(opts, `${pageName}.html`);
  if (!existsSync(filepath)) {
    errorOut(
      `Page "${pageName}" not found`,
      `Run 'infinity page list' to see available pages.`,
      opts.json
    );
  }
  const html = await fs.readFile(filepath, "utf-8");
  // 关键参数 decodeEntities: false 避免 cheerio 把中文转成实体编码
  const $ = cheerio.load(html, { decodeEntities: false });
  return { $, filepath };
}

/**
 * 把改完的 cheerio 实例写回文件
 */
export async function savePage($, filepath) {
  await fs.writeFile(filepath, $.html(), "utf-8");
}

// ============ 业务工具 ============

/**
 * 简单的 slug 生成器(用于匹配名称时去除大小写、空格等)
 * 例: "Infinity Medical" → "infinity-medical"
 */
export function slugify(text) {
  return (text || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

/**
 * 通过名称模糊匹配元素(用于 venture/dna 操作)
 * @param {*} $ cheerio 实例
 * @param {*} selector 卡片选择器
 * @param {*} titleSelector 卡片里标题的选择器(相对路径)
 * @param {*} name 用户输入的名称
 */
export function findByTitle($, selector, titleSelector, name) {
  const target = slugify(name);
  let matched = null;
  $(selector).each((i, el) => {
    const elName = $(el).find(titleSelector).text().trim();
    if (slugify(elName) === target) {
      matched = el;
      return false; // break
    }
  });
  return matched;
}
