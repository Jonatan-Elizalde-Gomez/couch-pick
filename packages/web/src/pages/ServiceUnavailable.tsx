import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getApiBase } from "../api/client";
import "./ServiceUnavailable.css";

type LocationState = {
  status?: number | null;
  reason?: string;
  path?: string;
  returnTo?: string;
};

export default function ServiceUnavailable() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state as LocationState | null) ?? null;
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  async function handleRetry() {
    setRetrying(true);
    setRetryError(null);

    try {
      const res = await fetch(`${getApiBase()}/health`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const returnTo = state?.returnTo && state.returnTo !== "/service-unavailable"
        ? state.returnTo
        : "/app";

      navigate(returnTo, { replace: true });
    } catch (error) {
      setRetryError(error instanceof Error ? error.message : "No se pudo reconectar");
    } finally {
      setRetrying(false);
    }
  }

  return (
    <main className="service-unavailable-layout">
      <section className="service-unavailable-card">
        <div className="service-unavailable-top">
          <div className="service-unavailable-brand">
            <img
              src="/couch-pick-logo-blanco.svg"
              alt="Couch Pick"
              className="service-unavailable-logo"
            />
            <span className="service-unavailable-app-name">Couch Pick</span>
          </div>

          <span className="service-unavailable-badge">Servicio temporalmente no disponible</span>
        </div>

        <h1 className="service-unavailable-title">No pudimos conectar con el backend</h1>
        <p className="service-unavailable-copy">
          La app sigue bien, pero el servicio que entrega tus contenidos no esta respondiendo como deberia.
          Puedes reintentar en unos momentos o volver al inicio.
        </p>

        {(state?.status || state?.reason || state?.path || retryError) && (
          <div className="service-unavailable-meta">
            {state?.status != null && <span>Estado: {state.status}</span>}
            {state?.path && <span>Ruta API: {state.path}</span>}
            {state?.reason && <span>Detalle: {state.reason}</span>}
            {retryError && <span>Reintento: {retryError}</span>}
          </div>
        )}

        <div className="service-unavailable-actions">
          <button
            type="button"
            className="service-unavailable-btn service-unavailable-btn-primary"
            onClick={handleRetry}
            disabled={retrying}
          >
            {retrying ? "Probando conexion..." : "Reintentar"}
          </button>
          <Link to="/" className="service-unavailable-btn service-unavailable-btn-secondary">
            Ir al inicio
          </Link>
        </div>
      </section>
    </main>
  );
}
