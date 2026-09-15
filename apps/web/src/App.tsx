import { Route, Routes } from "react-router-dom";
import { SessionProvider, useSession } from "./state";
import { Layout } from "./components/Layout";
import { Spinner } from "./components/ui";
import Landing from "./pages/Landing";
import Opening from "./pages/Opening";
import AuthCallback from "./pages/AuthCallback";
import Login from "./pages/Login";
import Onboarding from "./pages/Onboarding";
import SkillAnalysis from "./pages/SkillAnalysis";
import Roadmap from "./pages/Roadmap";
import Assessments from "./pages/Assessments";
import Quiz from "./pages/Quiz";
import Projects from "./pages/Projects";
import Jobs from "./pages/Jobs";
import Placement from "./pages/Placement";
import CompanyReviews from "./pages/CompanyReviews";
import Followups from "./pages/Followups";
import Profile from "./pages/Profile";
import Assistant from "./pages/Assistant";
import RecruiterSearch from "./pages/RecruiterSearch";
import CandidateProfile from "./pages/CandidateProfile";
import Pipeline from "./pages/Pipeline";
import PostJob from "./pages/PostJob";
import ProviderConsole from "./pages/ProviderConsole";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";

function Routed() {
  const { loading } = useSession();
  if (loading) return <Spinner label="Starting SkilloMetrics…" />;
  return (
    <Routes>
      {/* immersive routes render without the app navbar */}
      <Route path="/" element={<Opening />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route element={<Layout />}>
        <Route path="/welcome" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/skill-analysis" element={<SkillAnalysis />} />
        <Route path="/roadmap" element={<Roadmap />} />
        <Route path="/assessments" element={<Assessments />} />
        <Route path="/assessments/:id" element={<Quiz />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/placement" element={<Placement />} />
        <Route path="/company/:name" element={<CompanyReviews />} />
        <Route path="/followups" element={<Followups />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/assistant" element={<Assistant />} />
        <Route path="/recruiter" element={<RecruiterSearch />} />
        <Route path="/recruiter/candidate/:id" element={<CandidateProfile />} />
        <Route path="/recruiter/pipeline" element={<Pipeline />} />
        <Route path="/recruiter/post-job" element={<PostJob />} />
        <Route path="/provider" element={<ProviderConsole />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/admin" element={<Admin />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <SessionProvider>
      <Routed />
    </SessionProvider>
  );
}
