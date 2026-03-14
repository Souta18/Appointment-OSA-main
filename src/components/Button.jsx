import './Button.css'

export default function Button({
  children,
  variant = 'primary',
  type = 'button',
  className = '',
  loading = false,
  ...props
}) {
  const classes = ['btn', `btn-${variant}`, loading ? 'btn-loading' : '', className].filter(Boolean).join(' ')

  return (
    <button type={type} className={classes} disabled={loading || props.disabled} {...props}>
      {loading ? (
        <span className="btn-spinner" aria-hidden></span>
      ) : null}
      <span className="btn-content" style={{ opacity: loading ? 0.9 : 1 }}>{children}</span>
    </button>
  )
}
