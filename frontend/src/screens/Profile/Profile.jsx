import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { formatTenge, maskPhone } from '../../lib/format';
import { AVATAR_PRESETS, getAvatar } from '../../lib/avatars';
import { resolveTheme, setTheme } from '../../lib/theme';
import SegmentedControl from '../../components/SegmentedControl/SegmentedControl';
import Sheet from '../../components/Sheet/Sheet';
import Accordion from '../../components/Accordion/Accordion';
import t, { getLang, setLang } from '../../i18n';

const LANGS = [
  { key: 'ru', label: t.langRu },
  { key: 'kk', label: t.langKk },
];

const FAQ_ITEMS = t.faq.map((f) => ({ id: f.id, title: f.q, description: f.a }));

export default function Profile() {
  const navigate = useNavigate();
  const { user, setUser, login, logout } = useAuth();
  const { showToast } = useToast();

  const [editing, setEditing] = useState(false);
  const [dark, setDark] = useState(resolveTheme() === 'dark');

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleLogin() {
    if (!name.trim()) { showToast(t.loginErrName, 'error'); return; }
    if (!phone.trim()) { showToast(t.loginErrPhone, 'error'); return; }
    setBusy(true);
    try {
      await login(name.trim(), phone.trim());
    } catch {
      showToast(t.errServer, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function patchMe(data) {
    try {
      const updated = await apiFetch('/me', { method: 'PATCH', body: JSON.stringify(data) });
      setUser(updated);
      return updated;
    } catch {
      showToast(t.errServer, 'error');
    }
  }

  function toggleTheme(next) {
    setDark(next);
    setTheme(next ? 'dark' : 'light');
  }

  // Save the choice server-side (so it survives a new device) and locally,
  // then reload — the dictionary is bound at import time in i18n/index.js.
  async function changeLanguage(lang) {
    await patchMe({ language: lang });
    if (setLang(lang)) window.location.reload();
  }

  // ── Guest view ──
  if (!user) {
    return (
      <div className="profile page">
        <h1 className="profile__title">{t.profileTitle}</h1>
        <div className="profile__guest">
          <div className="profile__avatar profile__avatar--guest">👋</div>
          <p className="profile__guest-title">{t.profileGuestTitle}</p>
          <p className="profile__guest-sub">{t.profileGuestSubtitle}</p>

          <div className="profile__login">
            <label className="profile__field-label">{t.loginName}</label>
            <input className="profile__input" value={name} placeholder={t.loginNamePlaceholder}
              onChange={(e) => setName(e.target.value)} />
            <label className="profile__field-label">{t.loginPhone}</label>
            <input className="profile__input" type="tel" value={phone} placeholder={t.loginPhonePlaceholder}
              onChange={(e) => setPhone(e.target.value)} />
            <button className="profile__login-btn" onClick={handleLogin} disabled={busy}>
              {busy ? '…' : t.profileLogin}
            </button>
          </div>

          <div className="profile__rows">
            <div className="profile__row profile__row--theme">
              <span className="profile__row-label">🌙 {t.themeLabel}</span>
              <Toggle on={dark} onChange={toggleTheme} />
            </div>
          </div>
          <button className="profile__venue-link" onClick={() => navigate('/venue')}>{t.venueEntrance}</button>
        </div>
      </div>
    );
  }

  // ── Logged-in view ──
  const avatar = getAvatar(user.avatar_preset);

  return (
    <div className="profile page">
      <h1 className="profile__title">{t.profileTitle}</h1>

      <div className="profile__header">
        <div className="profile__avatar" style={avatar ? { background: avatar.gradient } : undefined}>
          {avatar ? avatar.emoji : (user.display_name?.[0] ?? user.name?.[0] ?? '🙂')}
        </div>
        <div className="profile__id">
          <p className="profile__name">{user.display_name ?? user.name}</p>
          {user.phone && <p className="profile__handle">{maskPhone(user.phone)}</p>}
        </div>
        <button className="profile__edit" onClick={() => setEditing(true)}>{t.editProfile}</button>
      </div>

      <div className="profile__impact">
        <p className="profile__impact-title">{t.impactTitle} 🌱</p>
        <div className="profile__impact-stats">
          <div className="profile__impact-stat">
            <span className="profile__impact-num">{user.boxes_saved}</span>
            <span className="profile__impact-label">{t.impactBoxesLabel}</span>
          </div>
          <div className="profile__impact-divider" />
          <div className="profile__impact-stat">
            <span className="profile__impact-num">{formatTenge(user.money_saved)}</span>
            <span className="profile__impact-label">{t.impactMoneyLabel}</span>
          </div>
        </div>
      </div>

      <div className="profile__rows">
        <div className="profile__row profile__row--col">
          <span className="profile__row-label">{t.langLabel}</span>
          <SegmentedControl segments={LANGS} value={getLang()} size="sm"
            onChange={changeLanguage} />
        </div>

        <div className="profile__row">
          <span className="profile__row-label">{t.notifsLabel}</span>
          <Toggle on={user.notifications} onChange={(v) => patchMe({ notifications: v })} />
        </div>

        <div className="profile__row profile__row--tap" onClick={() => navigate('/favorites')}>
          <span className="profile__row-label">♥ {t.favoritesLabel}</span>
          <span className="profile__row-value">{user.favorites_count ?? 0} ›</span>
        </div>

        <div className="profile__row profile__row--theme">
          <span className="profile__row-label">🌙 {t.themeLabel}</span>
          <Toggle on={dark} onChange={toggleTheme} />
        </div>

        <a className="profile__row profile__row--tap" href="https://t.me/obal_support" target="_blank" rel="noreferrer">
          <span className="profile__row-label">💬 {t.supportLabel}</span>
          <span className="profile__row-value">›</span>
        </a>
      </div>

      <section className="profile__faq">
        <h2 className="profile__section-title">{t.faqTitle}</h2>
        <Accordion items={FAQ_ITEMS} />
      </section>

      <button className="profile__venue-link" onClick={() => navigate('/venue')}>{t.venueEntrance}</button>
      <button className="profile__logout" onClick={logout}>{t.logoutLabel}</button>

      <EditSheet
        open={editing}
        user={user}
        onClose={() => setEditing(false)}
        onSave={async (data) => { await patchMe(data); setEditing(false); showToast(t.saved, 'success'); }}
      />
    </div>
  );
}

function EditSheet({ open, user, onClose, onSave }) {
  const [displayName, setDisplayName] = useState(user.display_name ?? user.name ?? '');
  const [preset, setPreset] = useState(user.avatar_preset ?? AVATAR_PRESETS[0].id);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await onSave({ display_name: displayName.trim() || user.name, avatar_preset: preset });
    setSaving(false);
  }

  return (
    <Sheet open={open} title={t.editProfile} onClose={onClose}>
      <label className="profile__field-label">{t.displayNameLabel}</label>
      <input className="profile__input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />

      <label className="profile__field-label" style={{ marginTop: 16 }}>{t.avatarLabel}</label>
      <div className="profile__avatar-grid">
        {AVATAR_PRESETS.map((a) => (
          <button
            key={a.id}
            type="button"
            className={`profile__avatar-opt${preset === a.id ? ' profile__avatar-opt--active' : ''}`}
            style={{ background: a.gradient }}
            onClick={() => setPreset(a.id)}
          >
            {a.emoji}
          </button>
        ))}
      </div>

      <button className="profile__login-btn" onClick={save} disabled={saving}>
        {saving ? '…' : t.editProfileSave}
      </button>
    </Sheet>
  );
}

function Toggle({ on, onChange }) {
  return (
    <button
      type="button"
      className={`toggle${on ? ' toggle--on' : ''}`}
      onClick={() => onChange(!on)}
      aria-pressed={on}
    >
      <span className="toggle__knob" />
    </button>
  );
}
