import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { RequireAuth } from "./RequireAuth";

const mockUseAuth = vi.fn();
vi.mock("../hooks/useAuth", () => ({ useAuth: () => mockUseAuth() }));

function renderWithRouter(ui: React.ReactElement) {
  return render(
    <MemoryRouter>
      <Routes>
        <Route path="/" element={ui} />
        <Route path="/login" element={<div>Login page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("RequireAuth", () => {
  beforeEach(() => {
    mockUseAuth.mockClear();
  });

  it("shows loading text while loading", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    renderWithRouter(
      <RequireAuth>
        <span>Protected</span>
      </RequireAuth>
    );
    expect(screen.getByText(/Загрузка/)).toBeInTheDocument();
    expect(screen.queryByText("Protected")).not.toBeInTheDocument();
  });

  it("does not render children when not authenticated", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    renderWithRouter(
      <RequireAuth>
        <span>Protected</span>
      </RequireAuth>
    );
    expect(screen.queryByText("Protected")).not.toBeInTheDocument();
    expect(screen.getByText("Login page")).toBeInTheDocument();
  });

  it("renders children when authenticated", () => {
    mockUseAuth.mockReturnValue({
      user: { id: 1, phone: "+7", role: "farmer", name: "Test" },
      loading: false,
    });
    renderWithRouter(
      <RequireAuth>
        <span>Protected</span>
      </RequireAuth>
    );
    expect(screen.getByText("Protected")).toBeInTheDocument();
  });
});
