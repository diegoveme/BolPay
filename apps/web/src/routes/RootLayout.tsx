import { Link, Outlet } from 'react-router-dom';

export function RootLayout() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/" className="brand">
          BolPay
        </Link>
        <nav>
          <Link to="/">Home</Link>
          <Link to="/dashboard">Dashboard</Link>
        </nav>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
