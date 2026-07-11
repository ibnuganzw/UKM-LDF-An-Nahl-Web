import { lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { RequireAdmin, RequireAuth } from './components/RouteGuards';
import Home from './pages/Home';
import Agenda from './pages/Agenda';
import AgendaDetail from './pages/AgendaDetail';
import Profil from './pages/Profil';
import Shalat from './pages/Shalat';
import Konten from './pages/Konten';
import Artikel from './pages/Artikel';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import PendingApproval from './pages/PendingApproval';

// Code-split the heavy, rarely-first-loaded routes out of the initial bundle:
// the Qur'an reader cluster (large verse renderers + tajweed sanitizer) and the
// whole admin panel (tiptap, mammoth, qrcode). Layout wraps <Outlet/> in a
// Suspense boundary so these load on demand. Public landing pages stay eager.
const Quran = lazy(() => import('./pages/Quran'));
const QuranReader = lazy(() => import('./pages/QuranReader'));
const JuzReader = lazy(() => import('./pages/JuzReader'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Scan = lazy(() => import('./pages/Scan'));
const Admin = lazy(() => import('./pages/Admin'));
const AdminQR = lazy(() => import('./pages/AdminQR'));
const AdminAnggota = lazy(() => import('./pages/AdminAnggota'));
const AdminAgendaForm = lazy(() => import('./pages/AdminAgendaForm'));
const AdminAgendaRoster = lazy(() => import('./pages/AdminAgendaRoster'));
const AdminArtikel = lazy(() => import('./pages/AdminArtikel'));
const AdminArtikelEditor = lazy(() => import('./pages/AdminArtikelEditor'));
const AdminStruktur = lazy(() => import('./pages/AdminStruktur'));

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
        <Route path="/quran/juz/:no" element={<JuzReader />} />
        <Route path="/konten" element={<Konten />} />
        <Route path="/konten/:slug" element={<Artikel />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/lupa-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/menunggu-persetujuan" element={<PendingApproval />} />
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
        <Route
          path="/admin/anggota"
          element={
            <RequireAdmin>
              <AdminAnggota />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/agenda/baru"
          element={
            <RequireAdmin>
              <AdminAgendaForm />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/agenda/:id/edit"
          element={
            <RequireAdmin>
              <AdminAgendaForm />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/agenda/:id/roster"
          element={
            <RequireAdmin>
              <AdminAgendaRoster />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/artikel"
          element={
            <RequireAdmin>
              <AdminArtikel />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/artikel/baru"
          element={
            <RequireAdmin>
              <AdminArtikelEditor />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/artikel/:id/edit"
          element={
            <RequireAdmin>
              <AdminArtikelEditor />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/struktur"
          element={
            <RequireAdmin>
              <AdminStruktur />
            </RequireAdmin>
          }
        />
        <Route path="*" element={<Home />} />
      </Route>
    </Routes>
  );
}
