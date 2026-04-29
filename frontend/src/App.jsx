import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import SignupPage from './pages/SignupPage.jsx';
import ReferralUpdatePage from './pages/ReferralUpdatePage.jsx';
import ResetPasswordPage from './pages/ResetPasswordPage.jsx';
import DirectReferralPage from './pages/DirectReferralPage.jsx';
import TravelQuizPage from './pages/TravelQuizPage.jsx';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/eu-indico" element={<DirectReferralPage />} />
        <Route path="/quiz-viagem" element={<TravelQuizPage />} />
        <Route path="/update-referral" element={<ReferralUpdatePage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/" element={<DashboardPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
