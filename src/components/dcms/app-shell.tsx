import { Link, useRouterState } from "@tanstack/react-router";
import {
  Bell,
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
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

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
import { Skeleton } from "@/components/ui/skeleton";
import { facilityById } from "@/data/mock";
import { inRoleScope, ROLES, useApp, type RoleId } from "@/lib/app-state";
import { cn } from "@/lib/utils";
import { GlobalSearch } from "./global-search";

const TABS = [
  { to: "/", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/schools", label: "Schools", icon: GraduationCap },
  { to: "/health", label: "Health facilities", icon: HeartPulse },
  { to: "/staff", label: "Staff", icon: UsersRound },
  { to: "/map", label: "Facilities & map", icon: MapPinned },
  { to: "/inbox", label: "Reports inbox", icon: Inbox },
  { to: "/review", label: "Review queue", icon: ClipboardCheck },
  { to: "/field-app", label: "Field app", icon: Smartphone },
] as const;

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

function TopBar() {
  const { role, setRole, lastSync } = useApp();
  const { critical } = useOpenReviewCount();
  return (
    <div className="no-print bg-topbar text-topbar-foreground">
      <div className="mx-auto flex h-[76px] max-w-[1600px] items-center gap-3 px-4 lg:px-8">
        <Link to="/" className="flex min-w-0 items-center gap-3 rounded-sm">
          <Emblem />
          <span className="min-w-0 leading-tight">
            <span className="block text-lg font-bold">
              DCMS Bannu
              <span className="ml-2 hidden border-l border-topbar-muted/40 pl-2 text-xs font-normal text-topbar-muted sm:inline">
                District Administration
              </span>
            </span>
            <span className="hidden truncate text-2xs text-topbar-muted sm:block">
              District Centralized Monitoring System
            </span>
          </span>
        </Link>
        <div className="ml-auto flex items-center gap-1 sm:gap-3">
          <GlobalSearch />
          <span
            className="hidden items-center gap-1.5 text-xs text-topbar-muted md:inline-flex"
            title="Last successful sync with the district server"
          >
            <span
              className="size-2 rounded-full bg-verified-tint ring-2 ring-verified"
              aria-hidden
            />
            Last sync <span className="tabular-nums text-topbar-foreground">{lastSync}</span>
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
              <DropdownMenuLabel className="text-xs text-ink-muted">
                View the system as
              </DropdownMenuLabel>
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
        </div>
      </div>
    </div>
  );
}

function TabRow() {
  const { open } = useOpenReviewCount();
  return (
    <nav aria-label="Main" className="no-print border-b border-line bg-surface">
      <div className="mx-auto flex h-[54px] max-w-[1600px] items-stretch gap-1 overflow-x-auto px-2 lg:px-6 [scrollbar-width:none]">
        {TABS.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            activeOptions={{ exact: "exact" in t ? t.exact : false }}
            className="nav-tab flex shrink-0 items-center gap-2 whitespace-nowrap px-3.5 text-sm text-ink-muted hover:bg-subtle hover:text-ink"
            activeProps={{ className: "tab-active font-semibold", "aria-current": "page" }}
          >
            <t.icon className="size-[17px]" strokeWidth={1.7} />
            {t.label}
            {t.to === "/review" && open > 0 && (
              <span className="rounded-sm bg-pending-tint px-1.5 text-xs font-semibold tabular-nums text-pending">
                {open}
              </span>
            )}
          </Link>
        ))}
      </div>
    </nav>
  );
}

function RouteSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading page" className="space-y-4">
      <Skeleton className="h-9 w-72 rounded-sm bg-line/60" />
      <Skeleton className="h-4 w-96 rounded-sm bg-line/50" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 rounded-lg bg-line/40" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-lg bg-line/40" />
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const first = useRef(true);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setLoading(true);
    const t = window.setTimeout(() => setLoading(false), 200);
    return () => window.clearTimeout(t);
  }, [pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <TopBar />
      <TabRow />
      <main
        id="main-content"
        tabIndex={-1}
        className={cn("mx-auto w-full max-w-[1600px] min-w-0 flex-1 px-4 pb-10 pt-7 lg:px-8")}
      >
        {loading ? <RouteSkeleton /> : children}
      </main>
      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-ink-muted lg:px-8">
          <p className="inline-flex items-center gap-2">
            <ShieldCheck className="size-4 text-kurram" /> District Administration Bannu{" "}
            <span className="text-line">/</span> Khyber Pakhtunkhwa
          </p>
          <p>
            Prototype with illustrative data.{" "}
            <span className="ml-2">
              English /{" "}
              <span lang="ur" dir="rtl" className="font-urdu">
                اردو
              </span>
            </span>
          </p>
        </div>
      </footer>
    </div>
  );
}
