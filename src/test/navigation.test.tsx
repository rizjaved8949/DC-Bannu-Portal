import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  healthRecordSearch,
  schoolRecordSearch,
  sectionForPath,
  PRIMARY_NAV,
} from "@/components/dcms/navigation";
import { WorkspaceBreadcrumbs } from "@/components/dcms/workspace-breadcrumbs";
import { AppStateProvider, useApp, type RoleId } from "@/lib/app-state";
import { facilityById } from "@/data/mock";

const location = vi.hoisted(() => ({ pathname: "/", search: {} as Record<string, unknown> }));
vi.mock("@tanstack/react-router", () => ({
  useRouterState: ({ select }: { select: (state: { location: typeof location }) => unknown }) =>
    select({ location }),
  Link: ({
    to,
    search: _search,
    children,
    ...props
  }: React.PropsWithChildren<{ to: string; search?: unknown }>) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));
function ScopedBreadcrumb({ role = "dc" }: { role?: RoleId }) {
  const { setRole } = useApp();
  return (
    <>
      <button onClick={() => setRole(role)}>Switch scope</button>
      <WorkspaceBreadcrumbs />
    </>
  );
}

describe("Navigation context and record deep links", () => {
  beforeEach(() => {
    window.localStorage.clear();
    location.pathname = "/";
    location.search = {};
  });
  afterEach(cleanup);
  it("recognizes every primary section and record without matching unrelated paths", () => {
    for (const item of PRIMARY_NAV) expect(sectionForPath(item.to)?.label).toBe(item.label);
    expect(sectionForPath("/health/HF201")?.to).toBe("/health");
    expect(sectionForPath("/staff/")?.to).toBe("/staff");
    expect(sectionForPath("/healthcare")).toBeUndefined();
  });
  it("validates shareable record sections and hospital shifts", () => {
    expect(healthRecordSearch({ section: "patients", shift: "E" })).toEqual({
      section: "patients",
      shift: "E",
    });
    expect(healthRecordSearch({ section: "students", shift: "invalid" })).toEqual({});
    expect(schoolRecordSearch({ section: "students" })).toEqual({ section: "students" });
    expect(schoolRecordSearch({ section: "patients" })).toEqual({});
  });
  it("links to real parents and names the current facility", () => {
    location.pathname = "/health/HF201";
    render(
      <AppStateProvider>
        <ScopedBreadcrumb />
      </AppStateProvider>,
    );
    expect(screen.getByRole("link", { name: "Go to overview" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Health facilities" })).toHaveAttribute(
      "href",
      "/health",
    );
    expect(screen.getByText(facilityById["HF201"]!.name)).toHaveAttribute("aria-current", "page");
  });
  it("names staff subviews and does not expose out-of-scope facility names", () => {
    location.pathname = "/staff";
    location.search = { tab: "posts" };
    const view = render(
      <AppStateProvider>
        <ScopedBreadcrumb />
      </AppStateProvider>,
    );
    expect(screen.getByText("Posts and vacancies")).toHaveAttribute("aria-current", "page");
    view.unmount();
    location.pathname = "/health/HF201";
    location.search = {};
    render(
      <AppStateProvider>
        <ScopedBreadcrumb role="deo" />
      </AppStateProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Switch scope" }));
    expect(screen.queryByText(facilityById["HF201"]!.name)).not.toBeInTheDocument();
    expect(screen.getByText("Record unavailable")).toBeInTheDocument();
  });
});
