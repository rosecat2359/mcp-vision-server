import { Outlet } from "react-router-dom";
import { Sidebar } from "./sidebar.js";
import { Topbar } from "./topbar.js";
import { useWebSocket } from "../../hooks/use-websocket.js";

export function AppShell() {
  useWebSocket();

  return (
    <div className="flex h-screen bg-canvas">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1200px] mx-auto p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
