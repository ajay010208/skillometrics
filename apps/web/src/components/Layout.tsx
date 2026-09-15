import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useSession } from "../state";
import { ChatWidget } from "./ChatWidget";

const roleLinks: Record<string, Array<{ to: string; label: string }>> = {
  trainee: [
    { to: "/skill-analysis", label: "Skill Analysis" },
    { to: "/roadmap", label: "Roadmap" },
    { to: "/assessments", label: "Assessments" },
    { to: "/projects", label: "Projects" },
    { to: "/jobs", label: "Jobs" },
    { to: "/placement", label: "Placement" },
    { to: "/followups", label: "Follow-ups" },
    { to: "/profile", label: "Profile" },
  ],
  recruiter: [
    { to: "/recruiter", label: "Talent Search" },
    { to: "/recruiter/pipeline", label: "Pipeline" },
    { to: "/recruiter/post-job", label: "Post Job" },
  ],
  provider: [{ to: "/provider", label: "Provider Console" }],
  admin: [
    { to: "/dashboard", label: "Impact Dashboard" },
    { to: "/admin", label: "Admin Panel" },
  ],
};

export function Layout() {
  const { me, logout } = useSession();
  const navigate = useNavigate();
  const role = me?.profile?.role;
  const links = role ? roleLinks[role] ?? [] : [];

  return (
    <div className="min-h-screen">
      <div className="aurora" />
      <nav className="sticky top-0 z-40 border-b border-slate-200 bg-[white]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <NavLink to="/" className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent">
              SkilloMetrics
            </span>
          </NavLink>
          <div className="ml-4 hidden flex-1 items-center gap-1 lg:flex">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    isActive ? "bg-slate-900/[0.06] text-slate-900" : "text-slate-500 hover:text-slate-900"
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-3">
            {me?.profile ? (
              <>
                <div className="hidden text-right sm:block">
                  <div className="text-sm font-semibold text-slate-900">{me.profile.name}</div>
                  <div className="text-[11px] uppercase tracking-wide text-amber-600">{me.profile.role}</div>
                </div>
                <button
                  className="btn-ghost"
                  onClick={() => {
                    logout();
                    navigate("/login");
                  }}
                >
                  Log out
                </button>
              </>
            ) : (
              <NavLink to="/login" className="btn-primary">
                Login
              </NavLink>
            )}
          </div>
        </div>
        {/* mobile links */}
        {links.length > 0 && (
          <div className="flex gap-1 overflow-x-auto px-4 pb-2 lg:hidden">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium ${
                    isActive ? "bg-slate-900/[0.06] text-slate-900" : "text-slate-500"
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </div>
        )}
      </nav>
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Outlet />
      </main>
      {me?.profile?.role === "trainee" && <ChatWidget />}
    </div>
  );
}
