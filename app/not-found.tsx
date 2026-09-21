import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 bg-white text-zinc-900">
      <p className="text-sm font-medium text-zinc-700">404：页面不存在</p>
      <Link
        href="/"
        className="text-xs text-zinc-400 underline transition-colors hover:text-zinc-700"
      >
        返回首页
      </Link>
    </div>
  );
}
