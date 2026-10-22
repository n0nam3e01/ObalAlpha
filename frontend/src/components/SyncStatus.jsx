export default function SyncStatus({ updatedAt, error, refresh }) {
  return <div className="sync-status">
    <p role="status">{updatedAt
      ? `Обновлено в ${updatedAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}. Проверяем каждые 20 секунд.`
      : 'Ожидаем обновления данных.'}</p>
    {error && <p className="form-error" role="alert">Не удалось обновить данные. {updatedAt ? 'Показаны последние загруженные данные.' : 'Проверьте подключение и попробуйте снова.'}</p>}
    <button className="text-button" type="button" onClick={() => { void refresh(); }}>Обновить сейчас</button>
  </div>;
}
