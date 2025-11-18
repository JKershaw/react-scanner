/**
 * NotFound (404) page component
 * Navigation: NotFound → Home
 */

import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div>
      <h1>404 - Page Not Found</h1>
      <nav>
        <Link to="/">Return to Home</Link>
      </nav>
    </div>
  );
}
