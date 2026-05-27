/**
 * Ventures 子公司命令
 *
 * 网站结构:
 * <div class="ventures-grid">
 *   <div class="venture-card">
 *     <div class="venture-logo-circle">
 *       <img src="..." alt="X Logo">
 *     </div>
 *     <h3 class="venture-title">Name</h3>
 *     <p class="venture-description">Description</p>
 *     <a href="..." target="_blank" class="venture-btn">Learn More</a>
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

const VENTURE_SELECTOR = ".ventures-grid > .venture-card";
const VENTURES_GRID = ".ventures-grid";

/**
 * 列出所有 ventures
 */
export async function ventureList(opts) {
  const { $ } = await loadPage(opts, "index");

  const ventures = [];
  $(VENTURE_SELECTOR).each((i, el) => {
    const $el = $(el);
    ventures.push({
      index: i,
      name: $el.find(".venture-title").text().trim(),
      description: $el.find(".venture-description").text().trim(),
      url: $el.find(".venture-btn").attr("href") || "",
      logo: $el.find(".venture-logo-circle img").attr("src") || "",
    });
  });

  output(
    {
      success: true,
      count: ventures.length,
      ventures,
      items: ventures,
    },
    opts.json
  );
}

/**
 * 查看单个 venture 详情
 */
export async function ventureGet(opts) {
  const { $ } = await loadPage(opts, "index");
  const el = findByTitle($, VENTURE_SELECTOR, ".venture-title", opts.name);

  if (!el) {
    errorOut(
      `Venture "${opts.name}" not found`,
      "Run 'infinity venture list' to see available ventures",
      opts.json
    );
  }

  const $el = $(el);
  output(
    {
      success: true,
      venture: {
        name: $el.find(".venture-title").text().trim(),
        description: $el.find(".venture-description").text().trim(),
        url: $el.find(".venture-btn").attr("href") || "",
        logo: $el.find(".venture-logo-circle img").attr("src") || "",
      },
    },
    opts.json
  );
}

/**
 * 添加新 venture
 */
export async function ventureAdd(opts) {
  if (!opts.name) {
    errorOut("--name is required", null, opts.json);
  }

  const { $, filepath } = await loadPage(opts, "index");

  // 检查是否已存在
  const existing = findByTitle($, VENTURE_SELECTOR, ".venture-title", opts.name);
  if (existing) {
    errorOut(
      `Venture "${opts.name}" already exists`,
      `Use 'infinity venture update "${opts.name}" ...' to modify it`,
      opts.json
    );
  }

  const $grid = $(VENTURES_GRID);
  if ($grid.length === 0) {
    errorOut(".ventures-grid not found in index.html", null, opts.json);
  }

  // 构造新卡片(注意缩进与现有 HTML 风格保持一致)
  const logo = opts.logo || "";
  const desc = opts.desc || opts.description || "";
  const url = opts.url || "#";
  const altText = `${opts.name} Logo`;

  const cardHtml = `
                <div class="venture-card">
                    <div class="venture-logo-circle">
                        <img src="${logo}" alt="${altText}">
                    </div>
                    <h3 class="venture-title">${opts.name}</h3>
                    <p class="venture-description">${desc}</p>
                    <a href="${url}" target="_blank" class="venture-btn">Learn More</a>
                </div>
                `;

  $grid.append(cardHtml);
  await savePage($, filepath);

  output(
    {
      success: true,
      message: chalk.green(`✓ Venture "${opts.name}" added`),
      venture: { name: opts.name, description: desc, url, logo },
    },
    opts.json
  );
}

/**
 * 更新已有 venture(可选字段:任意一个或多个)
 */
export async function ventureUpdate(opts) {
  const { $, filepath } = await loadPage(opts, "index");
  const el = findByTitle($, VENTURE_SELECTOR, ".venture-title", opts.name);

  if (!el) {
    errorOut(
      `Venture "${opts.name}" not found`,
      "Run 'infinity venture list' to see available ventures",
      opts.json
    );
  }

  const $el = $(el);
  const changes = [];

  if (opts.newName !== undefined) {
    $el.find(".venture-title").text(opts.newName);
    $el.find(".venture-logo-circle img").attr("alt", `${opts.newName} Logo`);
    changes.push(`name → "${opts.newName}"`);
  }
  if (opts.desc !== undefined || opts.description !== undefined) {
    const desc = opts.desc ?? opts.description;
    $el.find(".venture-description").text(desc);
    changes.push(`description → "${desc}"`);
  }
  if (opts.url !== undefined) {
    $el.find(".venture-btn").attr("href", opts.url);
    changes.push(`url → "${opts.url}"`);
  }
  if (opts.logo !== undefined) {
    $el.find(".venture-logo-circle img").attr("src", opts.logo);
    changes.push(`logo → "${opts.logo}"`);
  }

  if (changes.length === 0) {
    errorOut(
      "No fields to update",
      "Use --new-name, --desc, --url, or --logo",
      opts.json
    );
  }

  await savePage($, filepath);

  output(
    {
      success: true,
      message: chalk.green(`✓ Venture "${opts.name}" updated`),
      changes,
    },
    opts.json
  );
}

/**
 * 删除 venture
 */
export async function ventureRemove(opts) {
  const { $, filepath } = await loadPage(opts, "index");
  const el = findByTitle($, VENTURE_SELECTOR, ".venture-title", opts.name);

  if (!el) {
    errorOut(
      `Venture "${opts.name}" not found`,
      "Run 'infinity venture list' to see available ventures",
      opts.json
    );
  }

  $(el).remove();
  await savePage($, filepath);

  output(
    {
      success: true,
      message: chalk.green(`✓ Venture "${opts.name}" removed`),
    },
    opts.json
  );
}
