import { createBrowserRouter } from "react-router-dom";
import { Landing } from "./pages/landing.js";
import { Login } from "./pages/login.js";
import { Register } from "./pages/register.js";
import { Dashboard } from "./pages/dashboard.js";
import { Servers } from "./pages/servers.js";
import { ServerNew } from "./pages/server-new.js";
import { ServerDetail } from "./pages/server-detail.js";
import { Keys } from "./pages/keys.js";
import { Connect } from "./pages/connect.js";
import { Logs } from "./pages/logs.js";
import { Settings } from "./pages/settings.js";

export const router = createBrowserRouter([
  { path: "/", element: <Landing /> },
  { path: "/auth/login", element: <Login /> },
  { path: "/auth/register", element: <Register /> },
  { path: "/dashboard", element: <Dashboard /> },
  { path: "/dashboard/servers", element: <Servers /> },
  { path: "/dashboard/servers/new", element: <ServerNew /> },
  { path: "/dashboard/servers/:id", element: <ServerDetail /> },
  { path: "/dashboard/keys", element: <Keys /> },
  { path: "/dashboard/connect", element: <Connect /> },
  { path: "/dashboard/logs", element: <Logs /> },
  { path: "/dashboard/settings", element: <Settings /> },
]);
