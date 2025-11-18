/**
 * Home page component
 * Navigation: Home → About, Dashboard
 */

import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div>
      <h1>Home</h1>
      <nav>
        <Link to="/about">Go to About</Link>
        <Link to="/dashboard">Go to Dashboard</Link>
      </nav>
    </div>
  );
}
