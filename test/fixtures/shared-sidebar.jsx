/**
 * Test fixture: Shared sidebar component with navigation links
 */
import { Link } from 'react-router-dom';

function Sidebar() {
  return (
    <nav>
      <Link to="/settings/profile">Profile Settings</Link>
      <Link to="/settings/security">Security Settings</Link>
      <Link to="/dashboard">Dashboard</Link>
    </nav>
  );
}

export default Sidebar;
