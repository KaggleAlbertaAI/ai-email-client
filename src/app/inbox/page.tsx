// 收件箱页面

export default function InboxPage() {
  return (
    <div className="flex h-screen flex-col md:flex-row">
      {/* 侧边栏 */}
      <aside className="hidden w-64 border-r bg-muted/40 p-4 md:block">
        <h2 className="mb-4 text-lg font-semibold">文件夹</h2>
        <nav className="space-y-2">
          <a
            href="/inbox"
            className="block rounded-md bg-primary/10 px-3 py-2 text-sm font-medium"
          >
            收件箱
          </a>
          <a
            href="/sent"
            className="block rounded-md px-3 py-2 text-sm hover:bg-muted"
          >
            已发送
          </a>
          <a
            href="/drafts"
            className="block rounded-md px-3 py-2 text-sm hover:bg-muted"
          >
            草稿
          </a>
        </nav>
      </aside>

      {/* 邮件列表 */}
      <section className="flex w-full flex-1 flex-col border-r md:w-96">
        <div className="flex items-center justify-between border-b p-4">
          <h1 className="text-xl font-semibold">收件箱</h1>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-center text-sm text-muted-foreground">
            暂无邮件，请先添加邮箱账户
          </p>
        </div>
      </section>

      {/* 邮件详情 */}
      <section className="hidden flex-1 items-center justify-center text-muted-foreground md:flex">
        <p className="text-sm">选择一封邮件查看详情</p>
      </section>
    </div>
  );
}
