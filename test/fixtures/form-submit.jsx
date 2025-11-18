import { useNavigate } from 'react-router-dom';

export default function FormSubmit() {
  const navigate = useNavigate();

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      navigate('/success');
    }}>
      <input type="text" name="email" />
      <button type="submit">Submit</button>
    </form>
  );
}
