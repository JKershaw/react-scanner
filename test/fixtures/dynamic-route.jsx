import { Route } from 'react-router-dom';
import UserProfile from './UserProfile';

export default function DynamicRoute() {
  return <Route path="/user/:id" element={<UserProfile />} />;
}
