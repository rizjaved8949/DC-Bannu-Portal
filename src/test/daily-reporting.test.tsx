import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { facilities } from "@/data/mock";
import { AppStateProvider } from "@/lib/app-state";
import { DailyReporting } from "@/components/dcms/overview/daily-reporting";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    children,
    className,
  }: {
    to: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}));

describe("Understandable daily reporting", () => {
  beforeEach(() => {
    window.localStorage.clear();
    HTMLElement.prototype.scrollTo = vi.fn();
  });
  afterEach(cleanup);
  it("distinguishes received, accepted, rejected and outstanding facilities without changing totals", () => {
    render(
      <AppStateProvider>
        <DailyReporting facilities={facilities} />
      </AppStateProvider>,
    );
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent(
      "357 of 483 facilities have reported",
    );
    expect(
      screen.getByRole("img", { name: "74% of expected facilities have reported" }),
    ).toBeInTheDocument();
    const accepted = screen.getByRole("link", { name: /Accepted by the server/ });
    expect(within(accepted).getByText("325")).toBeInTheDocument();
    expect(
      within(accepted).getByText(/134 of these still need officer verification/),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("link", { name: /Need correction/ })).getByText("32"),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("link", { name: /Not received yet/ })).getByText("126"),
    ).toBeInTheDocument();
    expect(screen.getByText(/84 closed or non-functional schools excluded/)).toBeInTheDocument();
    expect(screen.queryByText(/Each square is one facility/)).not.toBeInTheDocument();
  });
  it("handles an empty role/filter scope without invalid percentages or negative counts", () => {
    render(
      <AppStateProvider>
        <DailyReporting facilities={[]} />
      </AppStateProvider>,
    );
    expect(screen.getByText("No reports expected for this selection")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear filters" })).toBeInTheDocument();
    expect(screen.queryByText(/NaN|Infinity/)).not.toBeInTheDocument();
  });
});
