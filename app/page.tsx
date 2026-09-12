import AppShell from "@/components/AppShell";
import {
  mockChapterContents,
  mockChapters,
  mockProjects,
} from "@/lib/mock-data";

export default function Page() {
  const currentProject = mockProjects[0];
  const currentChapter = mockChapters[0];

  return (
    <AppShell
      projects={mockProjects}
      chapters={mockChapters}
      initialChapterContent={mockChapterContents[currentChapter.id] ?? ""}
      currentProject={currentProject}
      currentChapter={currentChapter}
    />
  );
}
