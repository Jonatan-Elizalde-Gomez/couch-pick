import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { IconFilm, IconTv, IconPlay, IconSparkles } from "../components/icons";
import "./Landing.css";

const schema = z.object({
  email: z.string().email("Email no valido"),
  password: z.string().min(1, "Contrasena requerida"),
  remember: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

export default function Landing() {
  const navigate = useNavigate();
  const { login, error, isAuthenticated, isBootstrapping } = useAuth();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "", remember: false },
  });

  if (isBootstrapping) return null;
  if (isAuthenticated) return <Navigate to="/app" replace />;

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await login(data.email, data.password, data.remember);
      navigate("/app", { replace: true });
    } catch {
      // error ya en context
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="landing">
      <div className="landing-bg-deco" aria-hidden>
        <div className="landing-bg-blur landing-bg-blur-1" />
        <div className="landing-bg-blur landing-bg-blur-2" />
      </div>

      <div className="landing-floating-icons" aria-hidden>
        <IconFilm className="landing-float-icon landing-float-1" />
        <IconTv className="landing-float-icon landing-float-2" />
        <IconPlay className="landing-float-icon landing-float-3" />
        <IconSparkles className="landing-float-icon landing-float-4" />
      </div>

      <div className="landing-content">
        <div className="landing-brand">
          <img
            src="/couch-pick-logo-blanco.svg"
            alt="Couch Pick"
            className="landing-logo-image"
          />
          <h1 className="landing-app-name">Couch Pick</h1>
          <p className="landing-tagline">Tu asistente para elegir que ver</p>
        </div>

        <motion.div
          className="landing-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="landing-card-header">
            <h2 className="landing-form-title">Iniciar sesion</h2>
            <p className="landing-form-subtitle">
              Ingresa tus credenciales para continuar
            </p>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="landing-form">
            <div className="field">
              <label htmlFor="email">Correo electronico</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="tu@email.com"
                {...register("email")}
              />
              {errors.email && (
                <span className="field-error">{errors.email.message}</span>
              )}
            </div>
            <div className="field">
              <label htmlFor="password">Contrasena</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="********"
                {...register("password")}
              />
              {errors.password && (
                <span className="field-error">{errors.password.message}</span>
              )}
            </div>
            <label className="landing-remember">
              <input type="checkbox" {...register("remember")} />
              <span>Recordar sesion</span>
            </label>
            <button type="submit" className="btn-ingresar" disabled={loading}>
              {loading ? (
                <span className="landing-btn-loading">
                  <span className="landing-spinner" />
                  Ingresando...
                </span>
              ) : (
                "Ingresar"
              )}
            </button>
            {error && <p className="form-error">{error}</p>}
          </form>
        </motion.div>

        <div className="landing-features">
          <div className="landing-feature">
            <div className="landing-feature-icon landing-feature-blue">
              <IconFilm className="landing-feature-icon-svg" />
            </div>
            <p className="landing-feature-label">Peliculas</p>
          </div>
          <div className="landing-feature">
            <div className="landing-feature-icon landing-feature-emerald">
              <IconTv className="landing-feature-icon-svg" />
            </div>
            <p className="landing-feature-label">Series</p>
          </div>
          <div className="landing-feature">
            <div className="landing-feature-icon landing-feature-pink">
              <IconPlay className="landing-feature-icon-svg" />
            </div>
            <p className="landing-feature-label">Anime</p>
          </div>
        </div>
      </div>
    </main>
  );
}
