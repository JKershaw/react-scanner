/**
 * Dashboard page component
 * Navigation: Dashboard → Profile, Settings
 */

import { Link, NavLink } from 'react-router-dom';

export default function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      <nav>
        <Link to="/profile">View Profile</Link>
        <NavLink to="/settings">Open Settings</NavLink>
      </nav>
    </div>
  );
}
