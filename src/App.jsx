import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { FullPageLoader } from './components/ui'
import { useAuth } from './context/AuthContext'
import Admin from './pages/Admin'
import Gallery from './pages/Gallery'
import Home from './pages/Home'
import Login from './pages/Login'
import Profile from './pages/Profile'
import Welcome from './pages/Welcome'

/** Rotas do convidado: exigem um nome cadastrado. */
function Guarded({ children }) {
  const { guest, loading } = useAuth()
  if (loading) return <FullPageLoader />
  if (!guest) return <Navigate to="/entrar" replace />
  return <Layout>{children}</Layout>
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Welcome />} />
      <Route path="/entrar" element={<Login />} />
      <Route
        path="/app"
        element={
          <Guarded>
            <Home />
          </Guarded>
        }
      />
      <Route
        path="/app/galeria"
        element={
          <Guarded>
            <Gallery />
          </Guarded>
        }
      />
      <Route
        path="/app/perfil"
        element={
          <Guarded>
            <Profile />
          </Guarded>
        }
      />
      <Route path="/admin" element={<Admin />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
