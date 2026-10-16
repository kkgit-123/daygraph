import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Login from './Component/Login';
import AppShell from './Component/layout/AppShell';
import Loader from './Pages/Loader';
import { useSession } from './context/contexts';

const Today = lazy(() => import('./Pages/Today'));
const Review = lazy(() => import('./Pages/Review'));
const Ask = lazy(() => import('./Pages/Ask'));
const Graph = lazy(() => import('./Pages/Graph'));
const Settings = lazy(() => import('./Pages/Settings'));
const Team = lazy(() => import('./Pages/Team'));
const Google = lazy(() => import('./Pages/Google'));
const Search = lazy(() => import('./Pages/Search'));
const Agent = lazy(() => import('./Pages/Agent'));
const DeepReview = lazy(() => import('./Pages/DeepReview'));
const Meetings = lazy(() => import('./Pages/Meetings'));
const Manager = lazy(() => import('./Pages/Manager'));
const Discover = lazy(() => import('./Pages/Discover'));
const Reading = lazy(() => import('./Pages/Reading'));
const Addons = lazy(() => import('./Pages/Addons'));
const Admin = lazy(() => import('./Pages/Admin'));
const NotFound = lazy(() => import('./Pages/NotFound'));

const ProtectedRoute = ({ token, redirectPath = '/login' }) => {
  if (!token) {
    return <Navigate to={redirectPath} replace />;
  }
  return <Outlet />;
};

const App = () => {
  const { token, login, logout } = useSession();

  useEffect(() => {
    const checkTokenExpiration = () => {
      if (!token) return;
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (Date.now() >= payload.exp * 1000) {
          logout();
          window.location.href = '/login';
        }
      } catch (error) {
        console.error('Error parsing app token:', error);
        logout();
        window.location.href = '/login';
      }
    };

    const interval = setInterval(checkTokenExpiration, 1 * 60 * 1000); // Check every 1 minute
    return () => clearInterval(interval);
  }, [token, logout]);

  return (
    <Router>
      <Suspense fallback={<Loader />}>
        <Routes>
          <Route path="/login" element={<Login onLogin={login} />} />
          <Route element={<ProtectedRoute token={token} />}>
            <Route element={<AppShell />}>
              <Route index element={<Today />} />
              <Route path="team" element={<Team />} />
              <Route path="review" element={<Review />} />
              <Route path="ask" element={<Ask />} />
              <Route path="graph" element={<Graph />} />
              <Route path="search" element={<Search />} />
              <Route path="agent" element={<Agent />} />
              <Route path="deep-review" element={<DeepReview />} />
              <Route path="google" element={<Google />} />
              <Route path="meetings" element={<Meetings />} />
              <Route path="manager" element={<Manager />} />
              <Route path="discover" element={<Discover />} />
              <Route path="reading" element={<Reading />} />
              <Route path="addons" element={<Addons />} />
              <Route path="admin" element={<Admin />} />
              <Route path="settings" element={<Settings />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </Router>
  );
};

export default App;
