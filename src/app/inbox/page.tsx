// Inbox page

export default function InboxPage() {
  return (
    <div className="flex h-screen flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="hidden w-64 border-r bg-muted/40 p-4 md:block">
        <h2 className="mb-4 text-lg font-semibold">Folders</h2>
        <nav className="space-y-2">
          <a
            href="/inbox"
            className="block rounded-md bg-primary/10 px-3 py-2 text-sm font-medium"
          >
            Inbox
          </a>
          <a
            href="/sent"
            className="block rounded-md px-3 py-2 text-sm hover:bg-muted"
          >
            Sent
          </a>
          <a
            href="/drafts"
            className="block rounded-md px-3 py-2 text-sm hover:bg-muted"
          >
            Drafts
          </a>
        </nav>
      </aside>

      {/* Mail List */}
      <section className="flex w-full flex-1 flex-col border-r md:w-96">
        <div className="flex items-center justify-between border-b p-4">
          <h1 className="text-xl font-semibold">Inbox</h1>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-center text-sm text-muted-foreground">
            No emails yet. Please add an email account first.
          </p>
        </div>
      </section>

      {/* Mail Detail */}
      <section className="hidden flex-1 items-center justify-center text-muted-foreground md:flex">
        <p className="text-sm">Select an email to view details</p>
      </section>
    </div>
  );
}
