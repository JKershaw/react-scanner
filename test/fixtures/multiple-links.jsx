import { Link, NavLink } from 'react-router-dom';

export default function MultipleLinks() {
  return (
    <div>
      <Link to="/about">About</Link>
      <Link to="/contact">Contact</Link>
      <NavLink to="/dashboard">Dashboard</NavLink>
    </div>
  );
}
