import Authentication from "./pages/Authentication";
import Home from "./pages/Home";
import CollegeSelection from "./pages/CollegeSelection";
import ProfileDetails from "./pages/ProfileDetails";
import CollegeId from "./pages/CollegeId";
import LivePhotoPlaceholder from "./pages/LivePhotoPlaceholder";
import LivePhoto from "./pages/LivePhoto";
import MobileLivePhoto from "./pages/MobileLivePhoto";
import Review from "./pages/Review";
import VerificationPending from "./pages/VerificationPending";
import Questionnaire from "./pages/Questionnaire";
import Dashboard from "./pages/Dashboard";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminVerificationDetail from "./pages/AdminVerificationDetail";
import AdminMatches from "./pages/AdminMatches";
import ProfilePhoto from "./pages/ProfilePhoto";
import Payment from "./pages/Payment";
import Chat from "./pages/Chat";
import Chats from "./pages/Chats";
import MatchEngine from "./pages/MatchEngine";
import { AuthProvider } from "./store";
import "./App.css";

function App() {
  const rawPath = window.location.pathname || "/";
  const path = (rawPath.length > 1 ? rawPath.replace(/\/+$/, "") : rawPath).toLowerCase();

  return (
    <AuthProvider>
      {path === "/auth" ? (
        <Authentication />
      ) : path === "/onboarding/college" ? (
        <CollegeSelection />
      ) : path === "/onboarding/profile" ? (
        <ProfileDetails />
      ) : path === "/onboarding/college-id" ? (
        <CollegeId />
      ) : path === "/onboarding/profile-photo" ? (
        <ProfilePhoto />
      ) : path === "/onboarding/live-photo" ? (
        <LivePhoto />
      ) : path === "/verify/mobile" ? (
        <MobileLivePhoto />
      ) : path === "/onboarding/review" ? (
        <Review />
      ) : path === "/verification/pending" ? (
        <VerificationPending />
      ) : path === "/questionnaire" ? (
        <Questionnaire />
      ) : path === "/dashboard" ? (
        <Dashboard />
      ) : path === "/match" ? (
        <MatchEngine />
      ) : path === "/chats" ? (
        <Chats />
      ) : path === "/chat" || path.startsWith("/chat/") ? (
        <Chat />
      ) : path === "/payment" || path === "/plans" ? (
        <Payment />
      ) : path === "/admin/login" ? (
        <AdminLogin />
      ) : path === "/admin/dashboard" ? (
        <AdminDashboard />
      ) : path === "/admin/matches" ? (
        <AdminMatches />
      ) : path.startsWith("/admin/verifications/") ? (
        <AdminVerificationDetail />
      ) : (
        <Home />
      )}
    </AuthProvider>
  );
}

export default App;
