import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ComponentType } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppStateProvider, useApp } from "@/lib/app-state";
import { Route as LoginRoute } from "@/routes/login";

const navigate = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock("@tanstack/react-router", async (original) => ({
  ...(await original<typeof import("@tanstack/react-router")>()),
  useNavigate: () => navigate,
}));
const Login = LoginRoute.options.component as ComponentType;
function RoleProbe() {
  return <output data-testid="current-role">{useApp().role.id}</output>;
}

describe("Demo entry", () => {
  beforeEach(() => {
    window.localStorage.clear();
    navigate.mockClear();
  });
  afterEach(cleanup);
  it("opens the existing workspace with the selected role and no credentials", async () => {
    render(
      <AppStateProvider>
        <Login />
        <RoleProbe />
      </AppStateProvider>,
    );
    expect(
      screen.getByText("Sample data · No credentials collected"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: /District Health Officer/ }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: "/" }));
    expect(screen.getByTestId("current-role")).toHaveTextContent("dho-m");
  });
});
