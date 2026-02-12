import { Link } from "react-router-dom";

export default function Header() {
  return (
    <header className="py-8">
      <nav className="flex items-center justify-between">
        <Link to="/" className="text-xl font-bold text-gray-800 hover:text-accent">
          kyosu.dev
        </Link>
        <Link
          to="/"
          className="text-sm text-gray-500 hover:text-accent"
        >
          Blog
        </Link>
      </nav>
    </header>
  );
}
