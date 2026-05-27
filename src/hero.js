/**
 * Hero 区域命令
 *
 * 网站结构:
 * <section class="hero">
 *   <div class="hero-content">
 *     <h2>...</h2>   ← tagline (上面的标语)
 *     <h1>...</h1>   ← title (公司名)
 *     <p>...</p>     ← subtitle (副标语,如 "since 1993")
 *   </div>
 * </section>
 */

import chalk from "chalk";
import { loadPage, savePage, output, errorOut } from "./utils.js";

/**
 * 读取当前 hero 内容
 */
export async function heroGet(opts) {
  const { $ } = await loadPage(opts, "index");

  const tagline = $(".hero .hero-content h2").text().trim();
  const title = $(".hero .hero-content h1").text().trim();
  const subtitle = $(".hero .hero-content p").text().trim();

  output(
    {
      success: true,
      hero: {
        tagline,
        title,
        subtitle,
      },
    },
    opts.json
  );
}

/**
 * 设置 hero 内容(任意字段都可选,只改提供的)
 */
export async function heroSet(opts) {
  const { $, filepath } = await loadPage(opts, "index");

  const $tagline = $(".hero .hero-content h2");
  const $title = $(".hero .hero-content h1");
  const $subtitle = $(".hero .hero-content p");

  if ($tagline.length === 0 || $title.length === 0) {
    errorOut(
      "Hero structure not found in index.html",
      "The page must have a .hero section with .hero-content > h2/h1/p",
      opts.json
    );
  }

  const changes = [];
  if (opts.tagline !== undefined) {
    $tagline.text(opts.tagline);
    changes.push(`tagline → "${opts.tagline}"`);
  }
  if (opts.title !== undefined) {
    $title.text(opts.title);
    changes.push(`title → "${opts.title}"`);
  }
  if (opts.subtitle !== undefined) {
    $subtitle.text(opts.subtitle);
    changes.push(`subtitle → "${opts.subtitle}"`);
  }

  if (changes.length === 0) {
    errorOut(
      "No fields provided to update",
      "Use --tagline, --title, or --subtitle to specify what to change",
      opts.json
    );
  }

  await savePage($, filepath);

  output(
    {
      success: true,
      message: chalk.green(`✓ Hero updated (${changes.length} change(s))`),
      changes,
      hero: {
        tagline: $tagline.text().trim(),
        title: $title.text().trim(),
        subtitle: $subtitle.text().trim(),
      },
    },
    opts.json
  );
}
