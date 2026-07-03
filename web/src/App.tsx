import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { RequireAdmin, RequireAuth } from './components/RouteGuards';
import Home from './pages/Home';
import Agenda from './pages/Agenda';
import AgendaDetail from './pages/AgendaDetail';
import Profil from './pages/Profil';
import Shalat from './pages/Shalat';
import Quran from './pages/Quran';
import QuranReader from './pages/QuranReader';
import Konten from './pages/Konten';
import Artikel from './pages/Artikel';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Scan from './pages/Scan';
import Admin from './pages/Admin';
import AdminQR from './pages/AdminQR';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/agenda" element={<Agenda />} />
        <Route path="/agenda/:id" element={<AgendaDetail />} />
        <Route path="/profil" element={<Profil />} />
        <Route path="/shalat" element={<Shalat />} />
        <Route path="/quran" element={<Quran />} />
        <Route path="/quran/:no" element={<QuranReader />} />
        <Route path="/konten" element={<Konten />} />
        <Route path="/konten/:id" element={<Artikel />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/scan/:id"
          element={
            <RequireAuth>
              <Scan />
            </RequireAuth>
          }
        />
        <Route path="/admin" element={<Admin />} />
        <Route
          path="/admin/qr/:id"
          element={
            <RequireAdmin>
              <AdminQR />
            </RequireAdmin>
          }
        />
        <Route path="*" element={<Home />} />
      </Route>
    </Routes>
  );
}
