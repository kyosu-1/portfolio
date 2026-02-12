import { Outlet } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";

export default function Layout() {
  return (
    <div className="mx-auto max-w-2xl px-4">
      <Header />
      <main className="min-h-[60vh] py-4">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
