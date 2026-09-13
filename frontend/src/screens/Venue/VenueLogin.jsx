import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import t from '../../i18n/ru';

// Clean B2B login: one field accepting a 6-char code or a pasted magic link.
export default function VenueLogin({ onSubmit }) {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!code.trim() || busy) return;
    setBusy(true);
    setError(false);
    try {
      await onSubmit(code.trim());
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="vbiz vbiz-login">
      <div className="vbiz-login__card">
        <div className="vbiz-login__brand">
          <span className="vbiz-login__o">O</span><span className="vbiz-login__bal">bal</span>
          <span className="vbiz-login__tag">{t.vbBusiness}</span>
        </div>

        <form onSubmit={submit} className="vbiz-login__form">
          <input
            className={`vbiz-input vbiz-login__input${error ? ' vbiz-input--error' : ''}`}
            value={code}
            onChange={(e) => { setCode(e.target.value); setError(false); }}
            placeholder={t.vbLoginField}
            autoFocus
            aria-label={t.vbLoginField}
            autoCapitalize="characters"
          />
          {error && <p className="vbiz-login__error">{t.vbLoginError}</p>}
          <button type="submit" className="vbiz-btn vbiz-btn--primary vbiz-login__btn" disabled={busy || !code.trim()}>
            {busy ? '…' : t.vbLoginBtn}
          </button>
          <p className="vbiz-login__help">{t.vbLoginHelp}</p>
        </form>
      </div>

      <button className="vbiz-login__back" onClick={() => navigate('/')}>← {t.vbBackToShop}</button>
    </div>
  );
}
