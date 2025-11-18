/**
 * About page component
 * Navigation: About → Home
 */

import { Link } from 'react-router-dom';

export default function About() {
  return (
    <div>
      <h1>About</h1>
      <nav>
        <Link to="/">Back to Home</Link>
      </nav>
    </div>
  );
}
