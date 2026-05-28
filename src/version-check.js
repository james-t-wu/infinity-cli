/**
 * 版本检查器 - 后台异步检查 GitHub 最新版本
 *
 * Stage 2.5+ 更新:
 * - 自动识别用户的安装方式(全局 vs 项目本地)
 * - 给出对应的升级命令
 */

import fs from "fs/promises";
import path from "path";
import os from "os";
import https from "https";
import chalk from "chalk";
import { fileURLToPath } from "url";

const GITHUB_OWNER = process.env.INFINITY_REPO_OWNER || "james-t-wu";
const GITHUB_REPO = process.env.INFINITY_REPO_NAME || "infinity-cli";

const CACHE_DIR = path.join(os.homedir(), ".infinity-cli");
const CACHE_FILE = path.join(CACHE_DIR, "version-check.json");

const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 3000;

// ============ 安装方式检测 ============

/**
 * 检测 CLI 是怎么装的:全局还是项目本地?
 * 通过看当前执行的脚本路径判断
 */
function detectInstallMode() {
  try {
    // 获取当前执行脚本的目录(就是 bin/infinity.js 所在目录)
    // import.meta.url 在每个文件里不同,所以通过环境推断
    const argv1 = process.argv[1] || "";
    
    // 全局安装的路径模式:通常包含 /lib/node_modules/ 或 \npm\node_modules\
    if (argv1.includes("/lib/node_modules/") || argv1.includes("\\npm\\node_modules\\")) {
      return "global";
    }
    
    // 项目本地安装的路径模式:cwd/node_modules/.bin/ 或 cwd/node_modules/<pkg>/
    const cwd = process.cwd();
    if (argv1.startsWith(cwd) && argv1.includes("node_modules")) {
      return "local";
    }
    
    // npm link 的开发模式
    if (argv1.includes("node_modules") && !argv1.startsWith(cwd)) {
      return "linked";
    }
    
    return "unknown";
  } catch {
    return "unknown";
  }
}

/**
 * 根据安装方式给出对应的升级命令
 */
function getUpgradeCommand() {
  const mode = detectInstallMode();
  const repo = `github:${GITHUB_OWNER}/${GITHUB_REPO}`;
  
  switch (mode) {
    case "global":
      return `npm install -g ${repo}`;
    case "local":
      return `npm install ${repo}\n   # 或在 infinity-web 目录: git pull && npm install`;
    case "linked":
      return `# 你是开发模式,直接 git pull 即可\n   cd 你的 infinity-cli 目录 && git pull`;
    default:
      return `npm install -g ${repo}  # 全局安装\n   # 或: npm install ${repo}  # 项目本地安装`;
  }
}

// ============ 工具函数 ============

function compareVersions(a, b) {
  const pa = a.replace(/^v/, "").split(".").map(Number);
  const pb = b.replace(/^v/, "").split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return 1;
    if ((pa[i] || 0) < (pb[i] || 0)) return -1;
  }
  return 0;
}

function fetchLatestVersion() {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: "api.github.com",
      path: `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`,
      method: "GET",
      headers: {
        "User-Agent": "infinity-cli-version-check",
        "Accept": "application/vnd.github.v3+json",
      },
      timeout: REQUEST_TIMEOUT_MS,
    };

    const req = https.request(opts, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          if (res.statusCode === 404) return reject(new Error("No releases"));
          if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
          const parsed = JSON.parse(data);
          const version = (parsed.tag_name || "").replace(/^v/, "");
          if (!version) return reject(new Error("No tag_name"));
          resolve(version);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("timeout"));
    });
    req.end();
  });
}

async function readCache() {
  try {
    const text = await fs.readFile(CACHE_FILE, "utf-8");
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function writeCache(data) {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(CACHE_FILE, JSON.stringify(data, null, 2));
  } catch {}
}

// ============ 主函数 ============

export async function checkForUpdate(currentVersion) {
  try {
    const cache = await readCache();
    const now = Date.now();

    if (cache && now - cache.checkedAt < CHECK_INTERVAL_MS) {
      const cmp = compareVersions(cache.latestVersion, currentVersion);
      return {
        hasUpdate: cmp > 0,
        latestVersion: cache.latestVersion,
        currentVersion,
      };
    }

    const latestVersion = await fetchLatestVersion();
    await writeCache({ latestVersion, checkedAt: now });

    const cmp = compareVersions(latestVersion, currentVersion);
    return {
      hasUpdate: cmp > 0,
      latestVersion,
      currentVersion,
    };
  } catch (e) {
    return null;
  }
}

export function printUpdateNotice(result) {
  if (!result || !result.hasUpdate) return;

  const upgradeCmd = getUpgradeCommand();
  const mode = detectInstallMode();

  const message = [
    "",
    chalk.yellow("──────────────────────────────────────────────────"),
    chalk.bold(`🎉 infinity CLI 有新版本可用!`),
    "",
    `   当前版本: ${chalk.gray(result.currentVersion)}`,
    `   最新版本: ${chalk.green(result.latestVersion)}`,
    `   安装模式: ${chalk.gray(mode)}`,
    "",
    chalk.bold("升级命令(复制下面这行):"),
    chalk.cyan(`   ${upgradeCmd}`),
    chalk.yellow("──────────────────────────────────────────────────"),
    "",
  ];

  console.error(message.join("\n"));
}
