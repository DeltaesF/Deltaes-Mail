import Header from "@/component/Header";
import "../globals.css";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-full h-screen bg-blue-400 flex items-center justify-center">
      <div className="w-full max-w-7xl h-11/12 bg-white shadow-2xl rounded-2xl">
        <Header />
        {children}
      </div>
    </div>
  );
}
