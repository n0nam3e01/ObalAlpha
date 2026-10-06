import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { errorText, Icon, money, Shell } from '../ui';

function ThemeSettings() {
  const { theme, setTheme } = useTheme();
  return <section className="theme-settings" aria-label="Настройки темы"><div><strong>Тема приложения</strong></div><div className="theme-options" role="group" aria-label="Тема приложения">{[['light', 'Светлая'], ['dark', 'Тёмная'], ['system', 'Как на устройстве']].map(([value, label]) => <button key={value} type="button" aria-pressed={theme === value} className={theme === value ? 'active' : ''} onClick={() => setTheme(value)}>{label}</button>)}</div></section>;
}

function Links() {
  return <nav className="settings-list" aria-label="Ещё">
    <Link className="settings-row" to="/support"><span>Поддержка Öbal</span><Icon name="arrow"/></Link>
    <Link className="settings-row" to="/partner"><span>Кабинет заведения</span><Icon name="arrow"/></Link>
  </nav>;
}

export default function Profile() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthed, login, register, logout } = useAuth();
  const [mode, setMode] = useState('login');
  const [contactType, setContactType] = useState('email');
  const [form, setForm] = useState({ name: '', identifier: '', email: '', phone: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const change = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const returnTo = location.state?.returnTo;

  async function submit(e) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      if (mode === 'login') await login({ identifier: form.identifier, password: form.password });
      else await register({ name: form.name, [contactType]: form[contactType], password: form.password });
      if (typeof returnTo === 'string' && returnTo.startsWith('/') && !returnTo.startsWith('//')) navigate(returnTo, { replace: true });
    } catch (err) {
      if (err.code === 'account_exists') setMode('login');
      setError(errorText[err.code] || 'Не получилось войти. Проверьте данные и подключение.');
    } finally { setBusy(false); }
  }
  function switchMode(next) { setMode(next); setError(''); }

  if (isAuthed) {
    const name = user.display_name || user.name;
    return <Shell><main className="simple-page profile" id="main-content"><header><h1>Профиль</h1></header>
      <section className="profile-card"><div className="profile-avatar" aria-hidden="true">{(name || 'М')[0]}</div><div><h2>{name}</h2><p>{user.email || user.phone}</p><p className="profile-id">ID {user.public_id || `#${user.id}`}</p></div></section>
      <section className="impact-card" aria-label="Ваш вклад"><div><strong>{user.boxes_saved || 0}</strong><span>порций спасено</span></div><div><strong>{money(user.money_saved || 0)}</strong><span>сэкономлено</span></div></section>
      <ThemeSettings/>
      <Links/>
      <button type="button" className="text-button logout" onClick={() => { logout(); navigate('/'); }}>Выйти из аккаунта</button>
    </main></Shell>;
  }

  const isPhone = mode === 'register' && contactType === 'phone';
  return <Shell><main className="auth-page" id="main-content">
    <div className="auth-copy"><h1>{mode === 'login' ? 'Вход' : 'Регистрация'}</h1><p>{returnTo?.startsWith('/box/') ? 'Войдите, чтобы забронировать набор. Мы вернём вас к нему.' : mode === 'login' ? 'Войдите, чтобы бронировать наборы и видеть коды получения.' : 'Имя, почта или телефон и пароль. Больше ничего.'}</p></div>
    <div className="auth-tabs" role="group" aria-label="Режим"><button type="button" aria-pressed={mode === 'login'} className={mode === 'login' ? 'active' : ''} onClick={() => switchMode('login')}>Вход</button><button type="button" aria-pressed={mode === 'register'} className={mode === 'register' ? 'active' : ''} onClick={() => switchMode('register')}>Регистрация</button></div>
    <form className="auth-form" onSubmit={submit} noValidate={false}>
      {mode === 'register' && <><label className="field"><span>Имя</span><input value={form.name} onChange={change('name')} autoComplete="given-name" maxLength={100} required/></label>
        <div className="contact-switch" role="group" aria-label="Способ входа"><button type="button" aria-pressed={contactType === 'email'} className={contactType === 'email' ? 'active' : ''} onClick={() => setContactType('email')}>Почта</button><button type="button" aria-pressed={contactType === 'phone'} className={contactType === 'phone' ? 'active' : ''} onClick={() => setContactType('phone')}>Телефон</button></div></>}
      <label className="field"><span>{mode === 'login' ? 'Почта или телефон' : isPhone ? 'Телефон' : 'Почта'}</span>
        <input type={mode === 'register' ? (isPhone ? 'tel' : 'email') : 'text'} inputMode={isPhone ? 'tel' : mode === 'register' ? 'email' : undefined} placeholder={isPhone ? '+7 700 000 00 00' : mode === 'login' ? 'name@mail.kz или +7…' : 'name@mail.kz'} value={mode === 'login' ? form.identifier : form[contactType]} onChange={change(mode === 'login' ? 'identifier' : contactType)} autoComplete={mode === 'login' ? 'username' : isPhone ? 'tel' : 'email'} autoCapitalize="none" spellCheck="false" required/></label>
      <label className="field"><span>Пароль</span>
        <span className="password-field"><input type={showPassword ? 'text' : 'password'} value={form.password} onChange={change('password')} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength="8" maxLength="128" required aria-describedby={mode === 'register' ? 'password-hint' : undefined}/>
          <button type="button" onClick={() => setShowPassword((v) => !v)} aria-pressed={showPassword} aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}><Icon name="eye" size={20}/></button></span>
        {mode === 'register' && <small id="password-hint">Не короче 8 символов</small>}</label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button auth-submit" disabled={busy}>{busy ? 'Подождите…' : mode === 'login' ? 'Войти' : 'Создать аккаунт'}</button>
    </form>
    <p className="auth-note">Имя и телефон, если вы его указали, увидит заведение при выдаче заказа.</p>
    <ThemeSettings/>
    <Links/>
  </main></Shell>;
}
