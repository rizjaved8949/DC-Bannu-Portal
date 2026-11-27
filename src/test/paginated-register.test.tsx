import { StrictMode } from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PaginatedRegister } from "@/components/dcms/paginated-register";
import {
  RegisterNavigationContext,
  type RegisterPosition,
} from "@/components/dcms/navigation-memory";

const records = Array.from({ length: 28 }, (_, index) => `School ${index + 1}`);
function Register({ items = records, scope = "district" }: { items?: string[]; scope?: string }) {
  return (
    <PaginatedRegister items={items} label="schools" resetKey={scope}>
      {(rows) => (
        <table className="ledger">
          <tbody>
            {rows.map((name) => (
              <tr key={name}>
                <td data-label="School">{name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </PaginatedRegister>
  );
}
const visibleRows = () =>
  within(screen.getByRole("region", { name: "schools results" })).getAllByRole("row");
describe("Finite register browsing", () => {
  it("keeps restored coordinates when React replays mount effects", () => {
    const memory = new Map<string, RegisterPosition>([
      ["schools", { scope: "district", page: 1, size: 10, top: 200, left: 20 }],
    ]);
    render(
      <StrictMode>
        <RegisterNavigationContext.Provider value={memory}>
          <Register />
        </RegisterNavigationContext.Provider>
      </StrictMode>,
    );
    expect(HTMLElement.prototype.scrollTo).toHaveBeenLastCalledWith({
      top: 200,
      left: 20,
      behavior: "instant",
    });
  });
  it("restores the browsing page after opening a record and returning, within the same scope", () => {
    const memory = new Map<string, RegisterPosition>();
    const view = render(
      <RegisterNavigationContext.Provider value={memory}>
        <Register />
      </RegisterNavigationContext.Provider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Next page of schools" }));
    view.unmount();
    const returned = render(
      <RegisterNavigationContext.Provider value={memory}>
        <Register />
      </RegisterNavigationContext.Provider>,
    );
    expect(visibleRows()[0]).toHaveTextContent("School 11");
    returned.unmount();
    render(
      <RegisterNavigationContext.Provider value={memory}>
        <Register scope="different-role" />
      </RegisterNavigationContext.Provider>,
    );
    expect(visibleRows()[0]).toHaveTextContent("School 1");
  });
  beforeEach(() => {
    HTMLElement.prototype.scrollTo = vi.fn();
  });
  afterEach(cleanup);

  it("limits the rendered page, reaches every record and disables boundary controls", () => {
    render(<Register />);
    expect(visibleRows()).toHaveLength(10);
    expect(screen.getByRole("button", { name: "Previous page of schools" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Next page of schools" }));
    expect(visibleRows()[0]).toHaveTextContent("School 11");
    fireEvent.click(screen.getByRole("button", { name: "Last page of schools" }));
    expect(visibleRows()).toHaveLength(8);
    expect(visibleRows().at(-1)).toHaveTextContent("School 28");
    expect(screen.getByRole("button", { name: "Next page of schools" })).toBeDisabled();
  });

  it("resets pagination for a new search, sort or role scope and clamps smaller live results", () => {
    const view = render(<Register />);
    fireEvent.click(screen.getByRole("button", { name: "Last page of schools" }));
    view.rerender(<Register items={records.slice(0, 4)} scope="health-officer" />);
    expect(visibleRows()).toHaveLength(4);
    expect(screen.getByRole("button", { name: "Page 1 of schools" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    view.rerender(<Register />);
    expect(visibleRows()[0]).toHaveTextContent("School 1");
    fireEvent.click(screen.getByRole("button", { name: "Last page of schools" }));
    view.rerender(<Register items={records.slice(0, 13)} />);
    expect(visibleRows()).toHaveLength(3);
    expect(visibleRows()[0]).toHaveTextContent("School 11");
  });

  it("supports page-size selection and direct page jumps", () => {
    render(<Register />);
    fireEvent.change(screen.getByLabelText("Rows per page"), { target: { value: "5" } });
    expect(visibleRows()).toHaveLength(5);
    fireEvent.change(screen.getByRole("combobox", { name: "Go to page in schools" }), {
      target: { value: "3" },
    });
    expect(visibleRows()[0]).toHaveTextContent("School 16");
    fireEvent.change(screen.getByLabelText("Rows per page"), { target: { value: "25" } });
    expect(visibleRows()).toHaveLength(25);
    expect(visibleRows()[0]).toHaveTextContent("School 1");
  });

  it("prints every filtered record and restores the current page afterwards", () => {
    render(<Register />);
    fireEvent.click(screen.getByRole("button", { name: "Next page of schools" }));
    act(() => {
      window.dispatchEvent(new Event("beforeprint"));
    });
    expect(visibleRows()).toHaveLength(28);
    act(() => {
      window.dispatchEvent(new Event("afterprint"));
    });
    expect(visibleRows()).toHaveLength(10);
    expect(visibleRows()[0]).toHaveTextContent("School 11");
  });
});
