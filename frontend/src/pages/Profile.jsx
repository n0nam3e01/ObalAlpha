import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { CountUp, errorText, Icon, money, Shell } from '../ui';

const themes = [['light', 'Светлая'], ['dark', 'Тёмная'], ['system', 'Авто']];

function Segmented({ label, value, options, onChange }) {
  const index = Math.max(0, options.findIndex(([key]) => key === value));
  return <div className="segmented segmented--block" role="group" aria-label={label} style={{ '--seg': index, '--seg-count': options.length }}>
    <span className="segmented__thumb" aria-hidden="true"/>
    {options.map(([key, text]) => <button key={key} type="button" aria-pressed={value === key} className={value === key ? 'active' : ''} onClick={() => onChange(key)}>{text}</button>)}
  </div>;
}

function ThemeSettings() {
  const { theme, setTheme } = useTheme();
  return <section className="group" aria-label="Оформление">
    <h2 className="group-title">Оформление</h2>
    <div className="group__card group__card--padded"><div className="row-label"><span className="row-icon row-icon--plum"><Icon name="moon" size={17}/></span>Тема</div><Segmented label="Тема приложения" value={theme} options={themes} onChange={setTheme}/></div>
  </section>;
}

function Links() {
  return <nav className="group" aria-label="Ещё">
    <h2 className="group-title">Ещё</h2>
    <div className="group__card">
      <Link className="settings-row" to="/support"><span className="row-icon row-icon--green"><Icon name="chat" size={17}/></span><span>Поддержка Öbal</span><Icon name="arrow" size={18}/></Link>
      <Link className="settings-row" to="/partner"><span className="row-icon row-icon--coral"><Icon name="store" size={17}/></span><span>Кабинет заведения</span><Icon name="arrow" size={18}/></Link>
    </div>
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
    return <Shell><main className="simple-page profile" id="main-content">
      <header className="page-head"><h1 className="large-title">Профиль</h1></header>
      <section className="profile-card">
        <div className="profile-avatar" aria-hidden="true">{(name || 'М')[0]}</div>
        <div><h2>{name}</h2><p>{user.email || user.phone}</p><p className="profile-id">ID {user.public_id || `#${user.id}`}</p></div>
      </section>
      <section className="impact" aria-label="Ваш вклад">
        <div className="impact__tile impact__tile--green"><Icon name="leaf" size={20}/><strong><CountUp value={user.boxes_saved || 0}/></strong><span>порций спасено</span></div>
        <div className="impact__tile impact__tile--coral"><Icon name="wallet" size={20}/><strong><CountUp value={user.money_saved || 0} format={money}/></strong><span>сэкономлено</span></div>
      </section>
      <ThemeSettings/>
      <Links/>
      <button type="button" className="button button--quiet button--block logout" onClick={() => { logout(); navigate('/'); }}>Выйти из аккаунта</button>
    </main></Shell>;
  }

  const isPhone = mode === 'register' && contactType === 'phone';
  return <Shell><main className="auth-page" id="main-content">
    <div className="auth-copy">
      <span className="auth-copy__mark" aria-hidden="true"><Icon name="bag" size={30}/></span>
      <h1>{mode === 'login' ? 'Вход' : 'Регистрация'}</h1>
      <p>{returnTo?.startsWith('/box/') ? 'Войдите, чтобы забронировать набор. Мы вернём вас к нему.' : mode === 'login' ? 'Войдите, чтобы бронировать наборы и видеть коды получения.' : 'Имя, почта или телефон и пароль. Больше ничего.'}</p>
    </div>
    <Segmented label="Режим" value={mode} options={[['login', 'Вход'], ['register', 'Регистрация']]} onChange={switchMode}/>
    <form className="auth-form" onSubmit={submit}>
      {mode === 'register' && <><label className="field"><span>Имя</span><input value={form.name} onChange={change('name')} autoComplete="given-name" maxLength={100} required/></label>
        <Segmented label="Способ входа" value={contactType} options={[['email', 'Почта'], ['phone', 'Телефон']]} onChange={setContactType}/></>}
      <label className="field"><span>{mode === 'login' ? 'Почта или телефон' : isPhone ? 'Телефон' : 'Почта'}</span>
        <input type={mode === 'register' ? (isPhone ? 'tel' : 'email') : 'text'} inputMode={isPhone ? 'tel' : mode === 'register' ? 'email' : undefined} placeholder={isPhone ? '+7 700 000 00 00' : mode === 'login' ? 'name@mail.kz или +7…' : 'name@mail.kz'} value={mode === 'login' ? form.identifier : form[contactType]} onChange={change(mode === 'login' ? 'identifier' : contactType)} autoComplete={mode === 'login' ? 'username' : isPhone ? 'tel' : 'email'} autoCapitalize="none" spellCheck="false" required/></label>
      <label className="field"><span>Пароль</span>
        <span className="password-field"><input type={showPassword ? 'text' : 'password'} value={form.password} onChange={change('password')} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength="8" maxLength="128" required aria-describedby={mode === 'register' ? 'password-hint' : undefined}/>
          <button type="button" onClick={() => setShowPassword((v) => !v)} aria-pressed={showPassword} aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}><Icon name="eye" size={20}/></button></span>
        {mode === 'register' && <small id="password-hint">Не короче 8 символов</small>}</label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button button--primary button--block auth-submit" disabled={busy}>{busy && <span className="spinner" aria-hidden="true"/>}{busy ? 'Подождите…' : mode === 'login' ? 'Войти' : 'Создать аккаунт'}</button>
    </form>
    <p className="auth-note">Имя и телефон, если вы его указали, увидит заведение при выдаче заказа.</p>
    <ThemeSettings/>
    <Links/>
  </main></Shell>;
}
