/**
 * 数据目录解析。
 *
 * 数据（SQLite 索引、项目目录与正文）默认在 `<cwd>/data`，可由仓库根的
 * `.novelwriter.json` 指向别处，让数据不混在代码里。
 *
 * 配置为什么是文件而不是 app_settings：数据目录里装着 SQLite，而 app_settings
 * 就在那个 SQLite 里——把自己存进自己指向的位置，读不到。所以引导配置必须
 * 落在数据目录之外。
 *
 * 项目元数据里记录的仍是 `data/projects/<id>` 这种含字面 `data/` 的约定路径
 * （见 project.json 与 chapters.file_path，属历史格式）。resolveDataPath 负责
 * 把它解析到实际基准目录，因此换基准不需要重写已有记录。
 */
import fs from "node:fs";
import path from "node:path";

const CONFIG_PATH = path.join(process.cwd(), ".novelwriter.json");
const DEFAULT_DATA_DIR = path.join(process.cwd(), "data");

/** 缓存生效目录：一次进程内保持一致，切换时由 setDataDir 更新。 */
let cached: string | null = null;

/** 实际生效的数据目录（绝对路径）。未配置或配置损坏时回退默认。 */
export function getDataDir(): string {
  if (cached === null) {
    cached = readConfiguredDir() ?? DEFAULT_DATA_DIR;
  }
  return cached;
}

/** SQLite 文件位置。NOVELWRITER_DB_PATH 仅供测试指向一次性库。 */
export function getDbPath(): string {
  return (
    process.env.NOVELWRITER_DB_PATH ?? path.join(getDataDir(), "novelwriter.db")
  );
}

/** 写入配置并更新缓存，返回生效后的绝对路径。调用方负责校验入参。 */
export function setDataDir(dir: string): string {
  const resolved = path.resolve(dir);
  fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
  fs.writeFileSync(
    CONFIG_PATH,
    `${JSON.stringify({ dataDir: resolved }, null, 2)}\n`,
  );
  cached = resolved;
  return resolved;
}

/** 是否已由配置文件指定（false 表示用的是默认目录）。 */
export function isDataDirConfigured(): boolean {
  return readConfiguredDir() !== null;
}

/**
 * 把项目内记录的约定路径（以 `data/` 开头）解析为绝对路径。
 * 前缀不是 `data/` 时按原样拼接，保持与旧记录兼容。
 */
export function resolveDataPath(relativePath: string): string {
  return path.join(getDataDir(), relativePath.replace(/^data\//, ""));
}

/**
 * 解析并确认结果是数据目录**内部**的路径（严格深于数据目录），否则抛错。
 *
 * 删除类操作必须走这里：`root_path` 读自数据库，形如 `data/../../foo` 的值
 * 经 `path.join` 会逃出数据目录，而调用方接下来要对它 `rm -rf`。
 *
 * 空串或 `data/` 会解析成数据目录本身，也一并拒绝——那等于删掉全部项目。
 */
export function resolveDataPathInside(relativePath: string): string {
  const base = getDataDir();
  const resolved = resolveDataPath(relativePath);
  if (!resolved.startsWith(base + path.sep)) {
    throw new Error(`路径不是数据目录下的具体条目，已拒绝：${relativePath}`);
  }
  return resolved;
}

function readConfiguredDir(): string | null {
  try {
    const parsed = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8")) as {
      dataDir?: unknown;
    };
    if (typeof parsed.dataDir !== "string" || !parsed.dataDir.trim()) return null;
    return path.resolve(parsed.dataDir);
  } catch {
    // 文件不存在或不是合法 JSON：按未配置处理，回退默认目录
    return null;
  }
}
