import { Route } from 'react-router-dom';
import Home from './Home';

export default function SimpleRoute() {
  return <Route path="/" element={<Home />} />;
}
