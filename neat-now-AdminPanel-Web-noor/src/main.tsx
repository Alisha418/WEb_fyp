import { createRoot } from 'react-dom/client';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
} from 'react-router-dom';
import App from './App';
import { LoginScreen } from './pages/LoginScreen';
import { ResetPasswordScreen } from './pages/ResetPasswordScreen';
import './index.css';

function LoginWrapper() {
  const navigate = useNavigate();

  const handleLogin = () => {
    navigate('/');
  };

  return <LoginScreen onLogin={handleLogin} />;
}

createRoot(document.getElementById('root')!).render(
  <Router>
    <Routes>
      <Route path="/login" element={<LoginWrapper />} />
      <Route path="/reset-password" element={<ResetPasswordScreen />} />
      <Route path="/*" element={<App />} />
    </Routes>
  </Router>,
);
