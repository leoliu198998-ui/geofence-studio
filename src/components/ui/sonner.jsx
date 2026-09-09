import { Toaster as Sonner } from 'sonner'

function Toaster({ theme = 'dark', ...props }) {
  return (
    <Sonner
      theme={theme}
      position="bottom-center"
      toastOptions={{
        style: {
          background: 'rgb(var(--panel))',
          border: '1px solid rgb(var(--hairline))',
          color: 'rgb(var(--foreground))',
          fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
