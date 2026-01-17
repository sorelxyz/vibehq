import { Outlet } from 'react-router-dom';

export default function Layout() {
  return (
    <div className="h-screen bg-gray-50 dark:bg-neutral-950">
      <main className="h-full overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
