export default function EmptyState({ icon = '📦', title, description, action, onAction }) {
  return (
    <div className="empty-state">
      <span className="empty-state__icon">{icon}</span>
      {title && <p className="empty-state__title">{title}</p>}
      {description && <p className="empty-state__desc">{description}</p>}
      {action && (
        <button className="empty-state__action" onClick={onAction}>
          {action}
        </button>
      )}
    </div>
  );
}
