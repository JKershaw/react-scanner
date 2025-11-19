/**
 * Test fixture: Page with named imports
 */
import { NavMenu, Footer } from './components';
import { Link } from 'react-router-dom';

function Dashboard() {
  return (
    <div>
      <NavMenu />
      <h1>Dashboard</h1>
      <Link to="/profile">View Profile</Link>
      <Footer />
    </div>
  );
}

export default Dashboard;
