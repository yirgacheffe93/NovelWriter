import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Agents.md 由本项目自己维护，禁止 next dev 自动追加规则块
  agentRules: false,
  experimental: {
    // 导入小说的 txt 常超默认 1MB 上限
    serverActions: { bodySizeLimit: "10mb" },
  },
};

export default nextConfig;
