import { Routes, Route } from 'react-router-dom';
import Dashboard from './Dashboard';
import Profile from './Profile';
import Settings from './Settings';

export default function NestedRoutes() {
  return (
    <Routes>
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/dashboard/profile" element={<Profile />} />
      <Route path="/dashboard/settings" element={<Settings />} />
    </Routes>
  );
}
