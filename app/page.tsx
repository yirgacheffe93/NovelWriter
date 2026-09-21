import EmptyWorkspace from "@/features/workspace/components/EmptyWorkspace";
import { listProjects } from "@/features/workspace/server/project-repository";
import { redirect } from "next/navigation";

// 项目列表读自 SQLite，必须动态渲染，否则 build 时会把首屏静态化
export const dynamic = "force-dynamic";

export default async function Page() {
  const projects = await listProjects();
  if (projects.length === 0) {
    return <EmptyWorkspace />;
  }
  redirect(`/projects/${projects[0].id}`);
}
