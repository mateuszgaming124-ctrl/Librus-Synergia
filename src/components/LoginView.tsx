import React, { useEffect, useState } from 'react';
import { AlertTriangle, Eye, EyeOff, KeyRound, Lock, User, Wrench } from 'lucide-react';
import { MaintenanceBreak, UserAccount } from '../types/journal';
import { formatPolishDateTime } from '../utils/grades';

interface LoginViewProps {
  accounts: UserAccount[];
  maintenance?: MaintenanceBreak;
  isSyncingInitial?: boolean;
  onLogin: (
    account: UserAccount,
    serverAccounts?: UserAccount[],
    serverJournal?: unknown,
    serverAccountsMeta?: { revision?: number; updatedAt?: number; resetToken?: number }
  ) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  accounts,
  maintenance: initialMaintenance,
  isSyncingInitial,
  onLogin,
}) => {
  const [loginInput, setLoginInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [liveMaintenance, setLiveMaintenance] = useState<MaintenanceBreak | undefined>(
    initialMaintenance
  );

  useEffect(() => {
    setLiveMaintenance(initialMaintenance);
  }, [initialMaintenance]);

  useEffect(() => {
    let active = true;
    const fetchMaintenance = async () => {
      try {
        const res = await fetch('/api/maintenance', {
          cache: 'no-store',
          credentials: 'same-origin',
        });
        const ct = res.headers.get('content-type') || '';
        if (res.ok && ct.toLowerCase().includes('application/json') && active) {
          const data = (await res.json()) as MaintenanceBreak;
          setLiveMaintenance(data);
        }
      } catch {
        // ignore network error
      }
    };
    fetchMaintenance();
    const timer = setInterval(fetchMaintenance, 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const cleanLogin = loginInput.trim();
    const normalized = cleanLogin.toLowerCase();

    const findLocalMatch = () =>
      accounts.find(
        (acc) =>
          (acc.login.toLowerCase() === normalized ||
            (acc.email && acc.email.toLowerCase() === normalized)) &&
          acc.password === passwordInput
      );

    // 1. Query shared server first so all devices, updated passwords, permissions & real lastLoginAt stay synced
    setIsLoggingIn(true);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: cleanLogin, password: passwordInput }),
      });
      const ct = res.headers.get('content-type') || '';
      if (res.ok && ct.toLowerCase().includes('application/json')) {
        const data = await res.json();
        if (data.success && data.account) {
          onLogin(data.account, data.accounts, data.journal, data.accountsMeta);
          return;
        }
      } else {
        const errData = ct.toLowerCase().includes('application/json')
          ? await res.json().catch(() => null)
          : null;
        // If server restarted and hasn't received local accounts yet, restore & retry once
        const localMatch = findLocalMatch();
        if (res.status === 401 && localMatch) {
          const pushRes = await fetch('/api/accounts/save', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ account: localMatch }),
          }).catch(() => null);
          if (pushRes?.ok) {
            const retryRes = await fetch('/api/login', {
              method: 'POST',
              credentials: 'same-origin',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ login: cleanLogin, password: passwordInput }),
            }).catch(() => null);
            const retryCt = retryRes?.headers.get('content-type') || '';
            if (retryRes?.ok && retryCt.toLowerCase().includes('application/json')) {
              const retryData = await retryRes.json().catch(() => null);
              if (retryData?.success && retryData.account) {
                onLogin(
                  retryData.account,
                  retryData.accounts,
                  retryData.journal,
                  retryData.accountsMeta
                );
                return;
              }
            }
          }
        }
        if (errData?.error) {
          setError(errData.error);
          return;
        }
      }
    } catch {
      // Fallback to local accounts cache only when server is unreachable
    } finally {
      setIsLoggingIn(false);
    }

    const localFallback = findLocalMatch();
    if (localFallback) {
      const maint = liveMaintenance;
      if (maint?.enabled && maint.blockNonDirector && localFallback.role !== 'director') {
        setError('Przerwa techniczna: logowanie dostępne tylko dla Dyrektora.');
        return;
      }
      const nowStr = formatPolishDateTime(new Date());
      onLogin({
        ...localFallback,
        previousLoginAt: localFallback.lastLoginAt || undefined,
        lastLoginAt: nowStr,
      });
      return;
    }

    setError('Nieprawidłowy login lub hasło.');
  };

  const handleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) return;
    setResetSent(true);
  };

  const activeMaintenance = liveMaintenance?.enabled ? liveMaintenance : null;
  const maintenanceRange = activeMaintenance
    ? [
        activeMaintenance.from ? `od ${activeMaintenance.from}` : '',
        activeMaintenance.to ? `do ${activeMaintenance.to}` : '',
      ]
        .filter(Boolean)
        .join(' ')
    : '';

  return (
    <div className="min-h-screen bg-[#EAECEF] flex flex-col">
      {/* Classic Synergia top bar */}
      <div className="bg-[#111111] text-white text-[11px] h-7 flex items-center">
        <div className="max-w-[1140px] w-full mx-auto px-4 flex items-center justify-between">
          <span>LIBRUS Synergia</span>
          <span className="text-slate-300">Logowanie do systemu</span>
        </div>
      </div>

      {/* Silver-sage geometric header banner matching LIBRUS Synergia */}
      <header className="relative overflow-hidden border-b border-[#C5CCD4] bg-gradient-to-r from-[#ECEEEF] via-[#E5E8EC] to-[#B7CCC0]">
        <svg
          aria-hidden="true"
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full pointer-events-none opacity-45"
        >
          <polygon points="0,0 260,0 140,120 0,120" fill="#FFFFFF" fillOpacity="0.45" />
          <polygon points="260,0 540,0 410,120 140,120" fill="#DDE2E6" fillOpacity="0.45" />
          <polygon points="880,0 1160,0 1010,120 760,120" fill="#D5E3DA" fillOpacity="0.55" />
          <polygon points="1160,0 1440,0 1440,120 1010,120" fill="#9BB9A9" fillOpacity="0.55" />
        </svg>
        <div className="relative max-w-[1140px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#B81D6B] via-[#8E247B] to-[#5E195B] text-white flex items-center justify-center shadow-sm border-2 border-white">
              <span className="font-display font-extrabold text-2xl italic tracking-tighter">
                S
              </span>
            </div>
            <div className="leading-none">
              <div className="text-[10px] font-bold tracking-[0.18em] text-slate-700 text-right">
                LIBRUS
              </div>
              <div className="font-display text-3xl font-extrabold text-[#9A2578] tracking-tight -mt-0.5">
                Synergia
              </div>
            </div>
          </div>
          <span className="text-xs text-slate-700 hidden sm:inline font-medium">
            Dziennik elektroniczny
          </span>
        </div>
      </header>

      {/* Centered classic Synergia login box */}
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-[440px] space-y-4">
          {activeMaintenance && (
            <div
              role="status"
              className="bg-amber-50 border-2 border-amber-400 rounded-[3px] shadow-sm overflow-hidden"
            >
              <div className="bg-amber-500 text-white px-4 py-2 flex items-center gap-2">
                <Wrench className="w-4 h-4 shrink-0" />
                <span className="font-display text-sm font-bold tracking-wide uppercase">
                  Przerwa techniczna
                </span>
              </div>
              <div className="p-4 text-sm text-amber-950 space-y-1.5">
                <p className="font-semibold leading-snug">
                  {activeMaintenance.message || 'Przerwa techniczna w działaniu dziennika'}
                  {maintenanceRange && (
                    <span className="font-bold text-amber-900"> {maintenanceRange}</span>
                  )}
                </p>
                {activeMaintenance.blockNonDirector && (
                  <p className="text-xs text-amber-800 flex items-center gap-1.5 pt-1 border-t border-amber-200">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      Podczas przerwy logowanie jest tymczasowo dostępne tylko dla Dyrektora.
                    </span>
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="bg-white border border-[#C5CCD4] rounded-[3px] shadow-sm overflow-hidden">
            {/* Plum form header bar */}
            <div className="bg-[#8D2877] px-5 py-3.5 text-white border-b-2 border-[#76A815]">
              <h1 className="font-display text-base font-bold">
                Zaloguj się do systemu Synergia
              </h1>
              <p className="text-[11px] text-purple-100 mt-0.5">
                Podaj swój login (np. 1234225) oraz hasło dostępowe
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
              <div>
                <label
                  htmlFor="synergia-login"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Login
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="synergia-login"
                    type="text"
                    required
                    value={loginInput}
                    onChange={(e) => setLoginInput(e.target.value)}
                    autoComplete="username"
                    placeholder="np. 1234225 lub login"
                    className="w-full pl-8 pr-3 py-2 text-sm bg-white border border-[#BFC6CE] rounded-[2px] focus:outline-none focus:border-[#8D2877] text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="synergia-password"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Hasło
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="synergia-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    autoComplete="current-password"
                    placeholder="Wpisz hasło"
                    className="w-full pl-8 pr-9 py-2 text-sm bg-white border border-[#BFC6CE] rounded-[2px] focus:outline-none focus:border-[#8D2877] text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Ukryj hasło' : 'Pokaż hasło'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className="p-2.5 text-xs font-medium text-rose-800 bg-rose-50 border border-rose-200 rounded-[2px]"
                >
                  {error}
                </div>
              )}

              <div className="pt-1 flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setResetSent(false);
                    setResetEmail('');
                    setShowResetModal(true);
                  }}
                  className="text-xs font-medium text-[#8D2877] hover:underline cursor-pointer"
                >
                  Nie pamiętasz hasła?
                </button>

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="px-6 py-2 bg-[#76A815] hover:bg-[#659011] disabled:opacity-60 text-white font-semibold text-xs rounded-[2px] transition-colors cursor-pointer"
                >
                  {isLoggingIn ? 'Logowanie...' : 'Zaloguj'}
                </button>
              </div>
            </form>

            <div className="px-5 py-2.5 bg-[#F6F7F9] border-t border-[#E1E5EA] text-[11px] text-slate-600">
              Nowe konta oraz loginy (np. <span className="font-mono">1234225</span>) zakłada
              dyrektor w panelu <strong>Organizacja szkoły</strong>.
            </div>
          </div>

          <p className="text-center text-[11px] text-slate-500 mt-4">
            {isSyncingInitial
              ? 'Ładowanie zapisanych kont i danych szkoły...'
              : 'Połączenie szyfrowane · LIBRUS Synergia · Zapis automatyczny aktywny'}
          </p>
        </div>
      </main>

      {/* Password reset modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#C5CCD4] rounded-[3px] max-w-md w-full p-5 shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <KeyRound className="w-4 h-4 text-[#8D2877]" />
              <h2 className="font-display text-sm font-bold text-slate-900">
                Przypomnienie hasła
              </h2>
            </div>
            {!resetSent ? (
              <form onSubmit={handleResetSubmit} className="space-y-3 mt-3">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Podaj swój login do systemu lub adres e-mail powiązany z kontem. Jeśli konto
                  znajduje się w systemie, wyślemy instrukcję ustawienia nowego hasła.
                </p>
                <input
                  type="text"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="Login lub e-mail"
                  className="w-full px-3 py-2 text-sm border border-[#BFC6CE] rounded-[2px] focus:outline-none focus:border-[#8D2877]"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowResetModal(false)}
                    className="px-4 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-[2px] cursor-pointer"
                  >
                    Anuluj
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-semibold text-white bg-[#8D2877] hover:bg-[#6E1F5E] rounded-[2px] cursor-pointer"
                  >
                    Wyślij
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-3 mt-3">
                <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-[2px] p-3">
                  Wysłano instrukcję zmiany hasła na adres powiązany z podanym loginem.
                </p>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowResetModal(false)}
                    className="px-4 py-1.5 text-xs font-semibold text-white bg-[#8D2877] hover:bg-[#6E1F5E] rounded-[2px] cursor-pointer"
                  >
                    Zamknij
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
