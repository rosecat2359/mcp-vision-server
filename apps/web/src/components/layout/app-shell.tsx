import { Outlet } from "react-router-dom";
import { Sidebar } from "./sidebar.js";
import { Topbar } from "./topbar.js";

export function AppShell() {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
