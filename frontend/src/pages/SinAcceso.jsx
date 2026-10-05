import { useAuth } from "../lib/auth.jsx";

/** Pantalla para "Público registrado": cuenta válida pero sin rol. */
export default function SinAcceso() {
  const { user, logout } = useAuth();
  return (
    <div className="card mx-auto mt-10 max-w-md space-y-3 text-center">
      <h1 className="text-xl font-bold">Cuenta sin rol asignado</h1>
      <p className="text-sm text-slate-600">
        Hola {user.first_name || user.username}, tu cuenta ({user.email}) está registrada pero todavía no tiene un rol,
        por eso no podés acceder al panel. Pedile a un administrador que te asigne uno usando este email.
      </p>
      <p className="text-xs text-slate-500">
        Si solo querés consultar un matafuego, escaneá su código QR: la vista pública no requiere cuenta.
      </p>
      <button className="btn" onClick={logout}>Salir</button>
    </div>
  );
}
