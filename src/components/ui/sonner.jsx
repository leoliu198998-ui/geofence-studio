import { Toaster as Sonner } from 'sonner'

function Toaster(props) {
  return (
    <Sonner
      theme="dark"
      position="bottom-center"
      toastOptions={{
        style: {
          background: '#131922',
          border: '1px solid #26303B',
          color: '#E6EDF3',
          fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
