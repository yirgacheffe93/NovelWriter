"use server";

/**
 * 应用级设置的服务端 Action。
 *
 * 数据目录（SQLite 索引、项目目录与正文）默认在仓库内的 `data/`，可改到任意
 * 绝对路径，使数据与代码分开。配置落在仓库根的 `.novelwriter.json`，见
 * src/storage/paths.ts 说明为什么不能存在数据库里。
 *
 * 与 LLM 网关设置的区别：那些存在 app_settings（数据库内），这些必须存在
 * 数据库之外——所以两类设置不共用仓储，也不共用本文件。
 */
import fs from "node:fs";
import path from "node:path";
import { closeDb } from "../storage/db.ts";
import { getDataDir, isDataDirConfigured, setDataDir } from "../storage/paths.ts";

export interface DataDirSnapshot {
  dataDir: string;
  /** false 表示未配置，用的是仓库内默认目录 */
  configured: boolean;
}

export async function getDataDirAction(): Promise<DataDirSnapshot> {
  return { dataDir: getDataDir(), configured: isDataDirConfigured() };
}

export interface SetDataDirResult {
  dataDir: string;
  /** 目标目录里已有 SQLite 库；false 表示切换后是空工作台 */
  hasExistingData: boolean;
}

/**
 * 切换数据目录：校验 → 写配置 → 关连接（下次 getDb() 按新目录重开）。
 * 之后所有读取都指向新目录，调用方需要整页重载以清掉旧的客户端状态。
 */
export async function setDataDirAction(
  input: string,
): Promise<SetDataDirResult> {
  const dir = input.trim();
  if (!dir) {
    throw new Error("数据目录不能为空");
  }
  if (!path.isAbsolute(dir)) {
    throw new Error("请填写绝对路径，例如 /Users/you/Documents/novel_data");
  }
  if (fs.existsSync(dir) && !fs.statSync(dir).isDirectory()) {
    throw new Error("该路径已存在且不是文件夹");
  }

  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.accessSync(dir, fs.constants.W_OK);
  } catch {
    throw new Error("无法创建或写入该目录，请检查路径与权限");
  }

  const hasExistingData = fs.existsSync(path.join(dir, "novelwriter.db"));
  const resolved = setDataDir(dir);
  // 必须关掉：否则仍连着旧库，切换只改了磁盘上的配置
  closeDb();
  return { dataDir: resolved, hasExistingData };
}
