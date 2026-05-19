// 侧边栏组件

interface SidebarProps {
  folders: Array<{ name: string; unreadCount: number }>;
  activeFolder: string;
  onFolderChange: (folder: string) => void;
}

export function Sidebar({ folders, activeFolder, onFolderChange }: SidebarProps) {
  return (
    <aside className="hidden w-64 flex-col border-r bg-muted/40 p-4 md:flex">
      <h2 className="mb-4 text-lg font-semibold">文件夹</h2>
      <nav className="space-y-1">
        {folders.map((folder) => (
          <button
            key={folder.name}
            onClick={() => onFolderChange(folder.name)}
            className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
              activeFolder === folder.name
                ? "bg-primary/10 font-medium"
                : "hover:bg-muted"
            }`}
          >
            <span>{folder.name}</span>
            {folder.unreadCount > 0 && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                {folder.unreadCount}
              </span>
            )}
          </button>
        ))}
      </nav>
    </aside>
  );
}
