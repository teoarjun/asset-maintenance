import { Navigate, Route, Routes, Link, useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "./auth";
import Login from "./pages/Login";
import TaskList from "./pages/TaskList";
import TaskDetail from "./pages/TaskDetail";
import NewTask from "./pages/NewTask";

function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="layout">
      <header className="topbar">
        <Link to="/" className="brand">
          Asset Maintenance
        </Link>
        {user && (
          <div className="topbar-right">
            <span className="muted">
              {user.name} · {user.role}
            </span>
            <button
              type="button"
              className="btn ghost"
              onClick={() => {
                logout();
                navigate("/login");
              }}
            >
              Log out
            </button>
          </div>
        )}
      </header>
      <main className="main">{children}</main>
    </div>
  );
}

function PrivateRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="center muted">Loading…</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <TaskList />
          </PrivateRoute>
        }
      />
      <Route
        path="/tasks/new"
        element={
          <PrivateRoute>
            <NewTask />
          </PrivateRoute>
        }
      />
      <Route
        path="/tasks/:id"
        element={
          <PrivateRoute>
            <TaskDetail />
          </PrivateRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
