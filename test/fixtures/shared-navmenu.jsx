/**
 * Test fixture: Shared navigation menu component
 */
import { NavLink } from 'react-router-dom';

export function NavMenu() {
  return (
    <nav>
      <NavLink to="/">Home</NavLink>
      <NavLink to="/dashboard">Dashboard</NavLink>
      <NavLink to="/settings/profile">Settings</NavLink>
    </nav>
  );
}
