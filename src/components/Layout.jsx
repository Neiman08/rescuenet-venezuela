import Sidebar from "./Sidebar";
import Header from "./Header";

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-softBg flex">
      <Sidebar />
      <main className="flex-1 min-w-0 pb-20 md:pb-0">
        <Header />
        <div className="p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
}
