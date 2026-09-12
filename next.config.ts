import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Agents.md 由本项目自己维护，禁止 next dev 自动追加规则块
  agentRules: false,
};

export default nextConfig;
