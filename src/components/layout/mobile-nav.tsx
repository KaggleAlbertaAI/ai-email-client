// 移动端底部导航组件

export function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 flex items-center justify-around border-t bg-background p-2 md:hidden">
      <a href="/inbox" className="flex flex-col items-center p-2 text-xs">
        <span>收件箱</span>
      </a>
      <a href="/compose" className="flex flex-col items-center p-2 text-xs">
        <span>撰写</span>
      </a>
      <a href="/settings" className="flex flex-col items-center p-2 text-xs">
        <span>设置</span>
      </a>
    </nav>
  );
}
