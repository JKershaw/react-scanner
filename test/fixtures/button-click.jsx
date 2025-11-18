import { useNavigate } from 'react-router-dom';

export default function ButtonClick() {
  const navigate = useNavigate();

  return (
    <div>
      <button onClick={() => navigate('/dashboard')}>Go to Dashboard</button>
      <button onClick={() => navigate('/profile')}>View Profile</button>
    </div>
  );
}
