import { useNavigate } from 'react-router-dom';

export default function NavigateCall() {
  const navigate = useNavigate();

  const goHome = () => {
    navigate('/');
  };

  const goProfile = () => {
    navigate('/profile');
  };

  return (
    <div>
      <button onClick={goHome}>Home</button>
      <button onClick={goProfile}>Profile</button>
    </div>
  );
}
