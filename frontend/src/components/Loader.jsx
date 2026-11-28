function Loader({ label, size = 'regular' }) {
  return (
    <span className={`loader loader-${size}`} role="status">
      <span className="loader-spinner" aria-hidden="true" />
      <span className="visually-hidden">{label}</span>
    </span>
  )
}

export default Loader
