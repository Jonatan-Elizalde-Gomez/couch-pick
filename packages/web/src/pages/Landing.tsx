import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { IconFilm, IconTv, IconPlay, IconSparkles } from "../components/icons";
import "./Landing.css";

const schema = z.object({
  email: z.string().email("Email no válido"),
  password: z.string().min(1, "Contraseña requerida"),
  remember: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

export default function Landing() {
  const navigate = useNavigate();
  const { login, error, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "", remember: false },
  });

  if (isAuthenticated) {
    navigate("/app", { replace: true });
    return null;
  }

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
      {/* Background decorative elements */}
      <div className="landing-bg-deco" aria-hidden>
        <div className="landing-bg-blur landing-bg-blur-1" />
        <div className="landing-bg-blur landing-bg-blur-2" />
      </div>

      {/* Floating icons animation */}
      <div className="landing-floating-icons" aria-hidden>
        <IconFilm className="landing-float-icon landing-float-1" />
        <IconTv className="landing-float-icon landing-float-2" />
        <IconPlay className="landing-float-icon landing-float-3" />
        <IconSparkles className="landing-float-icon landing-float-4" />
      </div>

      <div className="landing-content">
        {/* Logo and brand */}
        <div className="landing-brand">
          <div className="landing-logo-box">
            <IconSparkles className="landing-logo-icon" />
          </div>
          <h1 className="landing-app-name">Couch Pick</h1>
          <p className="landing-tagline">Tu asistente para elegir qué ver</p>
        </div>

        <motion.div
          className="landing-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="landing-card-header">
            <h2 className="landing-form-title">Iniciar sesión</h2>
            <p className="landing-form-subtitle">
              Ingresa tus credenciales para continuar
            </p>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="landing-form">
            <div className="field">
              <label htmlFor="email">Correo electrónico</label>
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
              <label htmlFor="password">Contraseña</label>
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

        {/* Features preview */}
        <div className="landing-features">
          <div className="landing-feature">
            <div className="landing-feature-icon landing-feature-blue">
              <IconFilm className="landing-feature-icon-svg" />
            </div>
            <p className="landing-feature-label">Películas</p>
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
