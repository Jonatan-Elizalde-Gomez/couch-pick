import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { getBackendUnavailableEventName, type BackendUnavailableDetail } from "./api/client";
import Landing from "./pages/Landing";
import Main from "./pages/Main";
import Crud from "./pages/Crud";
import ServiceUnavailable from "./pages/ServiceUnavailable";

const pageTransition = {
  initial: { opacity: 0, y: 18, scale: 0.992 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.26,
      ease: [0.22, 1, 0.36, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.996,
    transition: {
      duration: 0.18,
      ease: [0.4, 0, 1, 1],
    },
  },
};

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isBootstrapping } = useAuth();
  if (isBootstrapping) return null;
  if (!isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    function handleBackendUnavailable(event: Event) {
      const detail = (event as CustomEvent<BackendUnavailableDetail>).detail;
      if (location.pathname === "/service-unavailable") return;
      navigate("/service-unavailable", {
        replace: true,
        state: {
          status: detail?.status ?? null,
          reason: detail?.reason ?? "Backend unavailable",
          path: detail?.path ?? null,
          returnTo: location.pathname,
        },
      });
    }

    window.addEventListener(getBackendUnavailableEventName(), handleBackendUnavailable);
    return () => window.removeEventListener(getBackendUnavailableEventName(), handleBackendUnavailable);
  }, [location.pathname, navigate]);

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={pageTransition}
        style={{ minHeight: "100vh" }}
      >
        <Routes location={location}>
          <Route path="/" element={<Landing />} />
          <Route path="/service-unavailable" element={<ServiceUnavailable />} />
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <Main />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/crud"
            element={
              <ProtectedRoute>
                <Crud />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
