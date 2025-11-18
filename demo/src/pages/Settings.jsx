/**
 * Settings page component
 * Navigation: Settings → Dashboard
 */

import { Link } from 'react-router-dom';

export default function Settings() {
  return (
    <div>
      <h1>Settings</h1>
      <nav>
        <Link to="/dashboard">Back to Dashboard</Link>
      </nav>
    </div>
  );
}
