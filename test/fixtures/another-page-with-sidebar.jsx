/**
 * Test fixture: Another page that imports and uses a shared sidebar
 */
import Sidebar from './shared-sidebar';
import { Link } from 'react-router-dom';

function SettingsSecurity() {
  return (
    <div>
      <Sidebar />
      <h1>Security Settings</h1>
      <Link to="/settings/profile">Go to Profile</Link>
    </div>
  );
}

export default SettingsSecurity;
