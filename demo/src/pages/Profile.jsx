/**
 * Profile page component
 * Navigation: Profile → Dashboard, Settings
 * Uses programmatic navigation with navigate()
 */

import { Link, useNavigate } from 'react-router-dom';

export default function Profile() {
  const navigate = useNavigate();

  const goToSettings = () => {
    navigate('/settings');
  };

  return (
    <div>
      <h1>Profile</h1>
      <nav>
        <Link to="/dashboard">Back to Dashboard</Link>
        <button onClick={goToSettings}>Go to Settings</button>
      </nav>
    </div>
  );
}
