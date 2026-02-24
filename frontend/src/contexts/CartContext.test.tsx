import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CartProvider, useCartContext } from "./CartContext";

function TestConsumer() {
  const { cartVersion, invalidateCart } = useCartContext();
  return (
    <div>
      <span data-testid="version">{cartVersion}</span>
      <button type="button" onClick={invalidateCart}>
        Invalidate
      </button>
    </div>
  );
}

describe("CartContext", () => {
  it("provides initial cartVersion 0", () => {
    render(
      <CartProvider>
        <TestConsumer />
      </CartProvider>
    );
    expect(screen.getByTestId("version")).toHaveTextContent("0");
  });

  it("invalidateCart increments cartVersion", async () => {
    const user = userEvent.setup();
    render(
      <CartProvider>
        <TestConsumer />
      </CartProvider>
    );
    expect(screen.getByTestId("version")).toHaveTextContent("0");
    await user.click(screen.getByRole("button", { name: /invalidate/i }));
    expect(await screen.findByTestId("version")).toHaveTextContent("1");
    await user.click(screen.getByRole("button", { name: /invalidate/i }));
    expect(await screen.findByTestId("version")).toHaveTextContent("2");
  });

  it("useCartContext returns default when outside provider", () => {
    function Orphan() {
      const { cartVersion } = useCartContext();
      return <span data-testid="orphan-version">{cartVersion}</span>;
    }
    render(<Orphan />);
    expect(screen.getByTestId("orphan-version")).toHaveTextContent("0");
  });
});
