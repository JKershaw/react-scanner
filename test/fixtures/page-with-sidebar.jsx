/**
 * Test fixture: Page that imports and uses a shared sidebar
 */
import Sidebar from './shared-sidebar';
import { Link } from 'react-router-dom';

function SettingsProfile() {
  return (
    <div>
      <Sidebar />
      <h1>Profile Settings</h1>
      <Link to="/settings/security">Go to Security</Link>
    </div>
  );
}

export default SettingsProfile;
