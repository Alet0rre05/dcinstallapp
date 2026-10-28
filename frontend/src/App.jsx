import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./lib/auth.jsx";
import { ListaSkeleton } from "./lib/Skeleton.jsx";
import Login from "./pages/Login.jsx";
import Registro from "./pages/Registro.jsx";
import Matafuegos from "./pages/Matafuegos.jsx";
import Tickets from "./pages/Tickets.jsx";
import Perfil from "./pages/Perfil.jsx";
import ScanQR from "./pages/ScanQR.jsx";
import Panel from "./pages/Panel.jsx";
import SinAcceso from "./pages/SinAcceso.jsx";
import Importar from "./pages/Importar.jsx";
import Etiquetas from "./pages/Etiquetas.jsx";
import Planillas from "./pages/Planillas.jsx";
import Tutoria from "./pages/Tutoria.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Reportes from "./pages/Reportes.jsx";
import Escanear from "./pages/Escanear.jsx";
import Layout from "./lib/Layout.jsx";
import { Pagina } from "./lib/animado.jsx";

/** Requiere sesión Y rol. Con sesión pero sin rol (público registrado) -> pantalla "sin acceso". */
function Privada({ children }) {
  const { user, loading, tieneRol } = useAuth();
  if (loading) return <div className="mx-auto max-w-md pt-6"><ListaSkeleton filas={2} /></div>;
  if (!user) return <Navigate to="/login" replace />;
  return tieneRol ? children : <SinAcceso />;
}

/** Solo ADMIN/OFICINA; el operario vuelve al inicio. (El backend igual responde 403.) */
function SoloStaff({ children }) {
  const { esStaff } = useAuth();
  return esStaff ? children : <Navigate to="/" replace />;
}

/** Rutas con entrada animada. Solo entrada: el cambio de pantalla nunca espera una animación de salida. */
function Rutas() {
  const location = useLocation();
  return (
    <Pagina key={location.pathname}>
      <Routes location={location}>
        <Route path="/qr/:token" element={<ScanQR />} />
        <Route path="/tutoria" element={<Tutoria />} />
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/" element={<Privada><Matafuegos /></Privada>} />
        <Route path="/importar" element={<Privada><SoloStaff><Importar /></SoloStaff></Privada>} />
        <Route path="/etiquetas" element={<Privada><SoloStaff><Etiquetas /></SoloStaff></Privada>} />
        <Route path="/planillas" element={<Privada><SoloStaff><Planillas /></SoloStaff></Privada>} />
        <Route path="/dashboard" element={<Privada><Dashboard /></Privada>} />
        <Route path="/reportes" element={<Privada><Reportes /></Privada>} />
        <Route path="/escanear" element={<Privada><Escanear /></Privada>} />
        <Route path="/tickets" element={<Privada><Tickets /></Privada>} />
        <Route path="/panel" element={<Privada><Panel /></Privada>} />
        <Route path="/perfil" element={<Privada><Perfil /></Privada>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Pagina>
  );
}

export default function App() {
  return (
    <Layout>
      <Rutas />
    </Layout>
  );
}



