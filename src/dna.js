/**
 * DNA 成就卡片命令
 *
 * 网站结构:
 * <div class="dna-grid">
 *   <div class="dna-card" data-aos="zoom-in" data-aos-delay="100">
 *     <div class="dna-icon">
 *       <i class="fas fa-flag"></i>
 *     </div>
 *     <div class="dna-card-content">
 *       <h3>Pioneer Fund</h3>
 *       <p>First batch of Israeli investment funds in Israel</p>
 *     </div>
 *   </div>
 * </div>
 */

import chalk from "chalk";
import {
  loadPage,
  savePage,
  output,
  errorOut,
  findByTitle,
} from "./utils.js";

const DNA_SELECTOR = ".dna-grid > .dna-card";
const DNA_GRID = ".dna-grid";

/**
 * 列出所有 DNA 卡片
 */
export async function dnaList(opts) {
  const { $ } = await loadPage(opts, "index");

  const cards = [];
  $(DNA_SELECTOR).each((i, el) => {
    const $el = $(el);
    cards.push({
      index: i,
      title: $el.find(".dna-card-content h3").text().trim(),
      description: $el.find(".dna-card-content p").text().trim(),
      icon: $el.find(".dna-icon i").attr("class") || "",
    });
  });

  output(
    {
      success: true,
      count: cards.length,
      cards,
      items: cards,
    },
    opts.json
  );
}

/**
 * 添加新 DNA 卡片
 */
export async function dnaAdd(opts) {
  if (!opts.title) {
    errorOut("--title is required", null, opts.json);
  }

  const { $, filepath } = await loadPage(opts, "index");

  // 检查是否已存在
  const existing = findByTitle(
    $,
    DNA_SELECTOR,
    ".dna-card-content h3",
    opts.title
  );
  if (existing) {
    errorOut(
      `DNA card "${opts.title}" already exists`,
      `Use 'infinity dna update "${opts.title}" ...' to modify it`,
      opts.json
    );
  }

  const $grid = $(DNA_GRID);
  if ($grid.length === 0) {
    errorOut(".dna-grid not found in index.html", null, opts.json);
  }

  const desc = opts.desc || opts.description || "";
  const icon = opts.icon || "fas fa-star"; // 默认图标

  // 自动计算 data-aos-delay(看现有卡片的 delay 递增)
  const existingCount = $(DNA_SELECTOR).length;
  const delay = 100 + existingCount * 50;

  const cardHtml = `
                    <div class="dna-card" data-aos="zoom-in" data-aos-delay="${delay}">
                        <div class="dna-icon">
                            <i class="${icon}"></i>
                        </div>
                        <div class="dna-card-content">
                            <h3>${opts.title}</h3>
                            <p>${desc}</p>
                        </div>
                    </div>
                    `;

  $grid.append(cardHtml);
  await savePage($, filepath);

  output(
    {
      success: true,
      message: chalk.green(`✓ DNA card "${opts.title}" added`),
      card: { title: opts.title, description: desc, icon },
    },
    opts.json
  );
}

/**
 * 更新 DNA 卡片
 */
export async function dnaUpdate(opts) {
  const { $, filepath } = await loadPage(opts, "index");
  const el = findByTitle(
    $,
    DNA_SELECTOR,
    ".dna-card-content h3",
    opts.title
  );

  if (!el) {
    errorOut(
      `DNA card "${opts.title}" not found`,
      "Run 'infinity dna list' to see available cards",
      opts.json
    );
  }

  const $el = $(el);
  const changes = [];

  if (opts.newTitle !== undefined) {
    $el.find(".dna-card-content h3").text(opts.newTitle);
    changes.push(`title → "${opts.newTitle}"`);
  }
  if (opts.desc !== undefined || opts.description !== undefined) {
    const desc = opts.desc ?? opts.description;
    $el.find(".dna-card-content p").text(desc);
    changes.push(`description → "${desc}"`);
  }
  if (opts.icon !== undefined) {
    $el.find(".dna-icon i").attr("class", opts.icon);
    changes.push(`icon → "${opts.icon}"`);
  }

  if (changes.length === 0) {
    errorOut(
      "No fields to update",
      "Use --new-title, --desc, or --icon",
      opts.json
    );
  }

  await savePage($, filepath);

  output(
    {
      success: true,
      message: chalk.green(`✓ DNA card "${opts.title}" updated`),
      changes,
    },
    opts.json
  );
}

/**
 * 删除 DNA 卡片
 */
export async function dnaRemove(opts) {
  const { $, filepath } = await loadPage(opts, "index");
  const el = findByTitle(
    $,
    DNA_SELECTOR,
    ".dna-card-content h3",
    opts.title
  );

  if (!el) {
    errorOut(
      `DNA card "${opts.title}" not found`,
      "Run 'infinity dna list' to see available cards",
      opts.json
    );
  }

  $(el).remove();
  await savePage($, filepath);

  output(
    {
      success: true,
      message: chalk.green(`✓ DNA card "${opts.title}" removed`),
    },
    opts.json
  );
}
