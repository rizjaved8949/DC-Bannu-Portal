import { Link, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Moon,
  Sun,
  ChevronRight,
  ChevronDown,
  Check,
  LayoutDashboard,
  GraduationCap,
  HeartPulse,
  UsersRound,
  MapPinned,
  Inbox,
  ClipboardCheck,
  Smartphone,
  ShieldCheck,
  MapPin,
  MessageSquareWarning,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { facilityById } from "@/data/mock";
import { inRoleScope, ROLES, useApp, type RoleId } from "@/lib/app-state";
import { cn } from "@/lib/utils";
import { WorkspaceControls } from "./workspace-controls";
import { GlobalSearch, SearchTrigger } from "./global-search";

/** `department` marks a tab that only applies to officers holding that portfolio. */
const TABS = [
  { to: "/", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/schools", label: "Schools", icon: GraduationCap, department: "Education", dept: "edu" },
  {
    to: "/health",
    label: "Health facilities",
    icon: HeartPulse,
    department: "Health",
    dept: "health",
  },
  { to: "/staff", label: "Staff", icon: UsersRound },
  { to: "/map", label: "Facilities & map", icon: MapPinned },
  { to: "/inbox", label: "Reports inbox", icon: Inbox },
  { to: "/review", label: "Review queue", icon: ClipboardCheck },
  { to: "/complaints", label: "Complaints", icon: MessageSquareWarning },
  { to: "/field-app", label: "Field app", icon: Smartphone },
] as const;

/** Section accent for a route: indigo for schools, teal for health, brand green elsewhere. */
function deptForPath(pathname: string): "edu" | "health" | undefined {
  if (pathname.startsWith("/schools")) return "edu";
  if (pathname.startsWith("/health")) return "health";
  return undefined;
}

function Emblem() {
  return (
    <span
      aria-hidden
      className="civic-emblem font-urdu flex size-11 shrink-0 items-center justify-center rounded-full bg-kurram text-[23px] leading-none text-topbar-foreground ring-1 ring-topbar-muted/50"
    >
      <span className="-mt-1.5">ب</span>
    </span>
  );
}

function useOpenReviewCount() {
  const { reviewItems, role } = useApp();
  const scoped = reviewItems.filter((r) => {
    const f = facilityById[r.facilityId];
    return f && inRoleScope(role, f);
  });
  return {
    open: scoped.filter((r) => r.status !== "Closed").length,
    critical: scoped.filter((r) => r.status !== "Closed" && r.severity === "Critical"),
  };
}

function TopBar({
  mobileNav,
  theme,
  toggleTheme,
}: {
  mobileNav: ReactNode;
  theme: string;
  toggleTheme: () => void;
}) {
  const { role, lastSync } = useApp();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const current = TABS.find((tab) =>
    tab.to === "/" ? pathname === "/" : pathname.startsWith(tab.to),
  );
  const { critical } = useOpenReviewCount();
  return (
    <div className="workspace-topbar no-print">
      <div className="flex h-[76px] items-center gap-3 px-4 lg:px-8">
        {mobileNav}
        <div
          className="workspace-breadcrumb hidden min-w-0 items-center gap-2 text-xs text-ink-muted sm:flex"
          aria-label="Breadcrumb"
        >
          <span className="hidden xl:inline">District workspace</span>
          <ChevronRight className="hidden size-3.5 xl:block" aria-hidden />
          <span className="truncate font-semibold text-ink">{current?.label ?? "Overview"}</span>
          {pathname.split("/").filter(Boolean).length > 1 && (
            <>
              <ChevronRight className="size-3.5" aria-hidden />
              <span>Record</span>
            </>
          )}
        </div>
        <div className="ml-auto flex items-center gap-1 sm:gap-3">
          <SearchTrigger compact />
          <button
            className="topbar-icon"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          >
            {theme === "dark" ? <Sun className="size-[18px]" /> : <Moon className="size-[18px]" />}
          </button>
          <WorkspaceControls />
          <span
            className="hidden items-center gap-1.5 text-xs text-topbar-muted md:inline-flex"
            title="Latest update to the reporting register"
          >
            <span
              className="size-2 rounded-full bg-verified-tint ring-2 ring-verified"
              aria-hidden
            />
            Updated <span className="tabular-nums text-topbar-foreground">{lastSync}</span>
          </span>
          <span className="hidden items-center gap-1.5 rounded-sm border border-topbar-muted/30 px-2.5 py-1.5 text-xs text-topbar-foreground md:inline-flex">
            <MapPin className="size-3.5" />
            {role.scopeLabel}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger
              className="relative flex size-9 items-center justify-center rounded-sm hover:bg-topbar-raised"
              aria-label={`Notifications, ${critical.length} critical`}
            >
              <Bell className="size-[18px]" />
              {critical.length > 0 && (
                <span className="absolute right-0.5 top-0.5 min-w-4 rounded-full bg-problem-tint px-1 text-[11px] font-bold leading-4 text-problem">
                  {critical.length}
                </span>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="text-xs text-ink-muted">
                Critical items needing attention
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {critical.length === 0 && (
                <div className="px-2 py-3 text-sm text-ink-muted">Nothing critical right now.</div>
              )}
              {critical.map((c) => (
                <DropdownMenuItem key={c.id} asChild>
                  <Link
                    to="/review"
                    search={{ item: c.id }}
                    className="flex flex-col items-start gap-0.5"
                  >
                    <span className="text-sm font-semibold text-ink">{c.detected}</span>
                    <span className="text-xs text-ink-muted">
                      {facilityById[c.facilityId]?.name}
                    </span>
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

function RoleMenu() {
  const { role, setRole } = useApp();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center gap-2 rounded-sm px-2 py-1 hover:bg-topbar-raised"
        aria-label="User menu and role"
      >
        <span className="flex size-7 items-center justify-center rounded-full bg-topbar-raised text-xs font-bold">
          {role.person
            .split(" ")
            .filter((p) => !p.endsWith("."))
            .slice(0, 2)
            .map((p) => p[0])
            .join("")}
        </span>
        <span className="hidden text-left leading-tight lg:block">
          <span className="block text-xs font-semibold">{role.person}</span>
          <span className="block text-2xs text-topbar-muted">{role.label}</span>
        </span>
        <ChevronDown className="size-4 text-topbar-muted" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel className="text-xs text-ink-muted">View the system as</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={role.id} onValueChange={(v) => setRole(v as RoleId)}>
          {ROLES.map((r) => (
            <DropdownMenuRadioItem
              key={r.id}
              value={r.id}
              className="flex flex-col items-start py-1.5"
            >
              <span className="text-sm font-semibold text-ink">{r.label}</span>
              <span className="text-xs text-ink-muted">
                {r.person}, {r.scopeLabel.toLowerCase()}
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <div className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-ink-muted">
          <Check className="size-3.5" />
          Switching role filters every page
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const GROUPS = [
  { label: "Workspace", paths: ["/", "/map"] },
  { label: "District directory", paths: ["/schools", "/health", "/staff"] },
  { label: "Daily operations", paths: ["/inbox", "/review", "/complaints", "/field-app"] },
];

function SideNavigation({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const { open } = useOpenReviewCount();
  const { role, lastSync } = useApp();
  const tabs = TABS.filter(
    (t) => !("department" in t) || !role.department || t.department === role.department,
  );
  return (
    <div className={cn("side-navigation", collapsed && "is-collapsed")}>
      <Link to="/" className="sidebar-brand" onClick={onNavigate} aria-label="DCMS Bannu home">
        <Emblem />
        <span className="sidebar-label">
          <strong>
            DCMS <span>Bannu</span>
          </strong>
          <small>District monitoring system</small>
        </span>
      </Link>
      <div className="sidebar-search">
        <SearchTrigger compact={collapsed} onOpen={onNavigate} />
      </div>
      <nav aria-label="Main" className="sidebar-nav">
        {GROUPS.map((group) => (
          <div className="nav-group" key={group.label}>
            <p className="nav-group-label">
              {collapsed ? <span aria-hidden>—</span> : group.label}
            </p>
            {tabs
              .filter((t) => group.paths.includes(t.to))
              .map((t) => (
                <Tooltip key={t.to}>
                  <TooltipTrigger asChild>
                    <Link
                      to={t.to}
                      onClick={onNavigate}
                      data-dept={"dept" in t ? t.dept : undefined}
                      activeOptions={{ exact: "exact" in t ? t.exact : false }}
                      className="sidebar-link"
                      aria-label={t.label}
                      activeProps={{ className: "is-active", "aria-current": "page" }}
                    >
                      <t.icon className="size-[19px] shrink-0" strokeWidth={1.7} />
                      <span className="sidebar-label">{t.label}</span>
                      {t.to === "/review" && open > 0 && (
                        <span className="sidebar-count">{open}</span>
                      )}
                    </Link>
                  </TooltipTrigger>
                  {collapsed && <TooltipContent side="right">{t.label}</TooltipContent>}
                </Tooltip>
              ))}
          </div>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="sidebar-note sidebar-label">
          <ShieldCheck className="size-5" aria-hidden />
          <div>
            <strong>Every report matters.</strong>
            <p>Better visibility. Better public services.</p>
          </div>
        </div>
        <div className="sidebar-sync sidebar-label">
          <span className="sync-dot" aria-hidden />
          Register updated at {lastSync}
        </div>
        <div className="sidebar-profile">
          <RoleMenu />
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState("light");
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("dcms-sidebar-collapsed") === "true");
      const savedTheme = localStorage.getItem("dcms-theme") === "dark" ? "dark" : "light";
      setTheme(savedTheme);
      document.documentElement.classList.toggle("dark", savedTheme === "dark");
    } catch {
      /* The workspace also works without browser storage. */
    }
  }, []);
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);
  useEffect(() => {
    let openedForPrint: HTMLDetailsElement[] = [];
    const before = () => {
      openedForPrint = Array.from(
        document.querySelectorAll<HTMLDetailsElement>(".insights-disclosure:not([open])"),
      );
      openedForPrint.forEach((section) => {
        section.open = true;
      });
    };
    const after = () => {
      openedForPrint.forEach((section) => {
        section.open = false;
      });
      openedForPrint = [];
    };
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, []);
  useEffect(() => {
    const closeForSearch = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") setMobileOpen(false);
    };
    window.addEventListener("keydown", closeForSearch);
    return () => window.removeEventListener("keydown", closeForSearch);
  }, []);
  useEffect(() => {
    if (
      !window.IntersectionObserver ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting) {
            entry.target.animate(
              [
                { opacity: 0.5, transform: "translateY(10px)" },
                { opacity: 1, transform: "translateY(0)" },
              ],
              { duration: 360, easing: "cubic-bezier(.2,.7,.2,1)" },
            );
            observer.unobserve(entry.target);
          }
      },
      { threshold: 0.06 },
    );
    document
      .querySelectorAll("#main-content .panel:not(.kpi-tile), #main-content .district-register")
      .forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [pathname]);
  const toggleSidebar = () => {
    setCollapsed((value) => {
      try {
        localStorage.setItem("dcms-sidebar-collapsed", String(!value));
      } catch {
        /* optional preference */
      }
      return !value;
    });
  };
  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    try {
      localStorage.setItem("dcms-theme", next);
    } catch {
      /* optional preference */
    }
  };
  const mobileNav = (
    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
      <SheetTrigger asChild>
        <button className="topbar-icon lg:hidden" aria-label="Open navigation">
          <Menu className="size-5" />
        </button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="mobile-navigation w-[288px] max-w-[88vw] p-0"
        aria-describedby="mobile-nav-description"
      >
        <SheetTitle className="sr-only">District workspace navigation</SheetTitle>
        <SheetDescription id="mobile-nav-description" className="sr-only">
          Navigate sections, search the directory, or change your role.
        </SheetDescription>
        <SideNavigation onNavigate={() => setMobileOpen(false)} />
      </SheetContent>
    </Sheet>
  );
  return (
    <TooltipProvider delayDuration={150}>
      <GlobalSearch />
      <div
        className={cn("dcms-app-shell min-h-screen bg-canvas", collapsed && "sidebar-collapsed")}
      >
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <aside className="desktop-sidebar no-print">
          <SideNavigation collapsed={collapsed} />
          <button
            onClick={toggleSidebar}
            className="sidebar-collapse"
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeftOpen className="size-4" />
            ) : (
              <PanelLeftClose className="size-4" />
            )}
          </button>
        </aside>
        <div className="workspace-frame">
          <TopBar mobileNav={mobileNav} theme={theme} toggleTheme={toggleTheme} />
          <main
            id="main-content"
            tabIndex={-1}
            data-dept={deptForPath(pathname)}
            data-section={pathname.split("/").filter(Boolean)[0] ?? "overview"}
            className="workspace-main"
          >
            <div className="route-content">{children}</div>
          </main>
          <footer className="workspace-footer">
            <p>
              <ShieldCheck className="size-4 text-kurram" />
              District Administration Bannu{" "}
              <span className="hidden sm:inline">· Khyber Pakhtunkhwa</span>
            </p>
            <p>
              Built around public service <span className="footer-divider" /> English /{" "}
              <span lang="ur" dir="rtl" className="font-urdu">
                اردو
              </span>
            </p>
          </footer>
        </div>
      </div>
    </TooltipProvider>
  );
}
