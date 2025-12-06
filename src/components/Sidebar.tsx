import { SidebarContent } from "./SidebarContent";

export function Sidebar() {
  return (
    <div className="hidden md:flex h-screen w-80 flex-col border-r bg-sidebar overflow-y-auto">
      <SidebarContent />
    </div>
  );
}
