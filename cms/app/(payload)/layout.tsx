type Args = {
  children: React.ReactNode;
};

/**
 * API route handlers in this group still use Payload directly. The generated
 * admin React layout is deliberately omitted because /admin is deprecated.
 */
export default function PayloadRouteBoundary({ children }: Args) {
  return children;
}
