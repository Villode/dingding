import Backdrop from '@mui/material/Backdrop'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'
import DoneIcon from '@mui/icons-material/Done'

interface ProgressProps {
  open?: boolean
  value?: number
}

export function Progress(props: ProgressProps) {
  const { open = false, value = 0 } = props
  return (
    <Backdrop
      sx={(theme) => ({ color: '#fff', zIndex: theme.zIndex.drawer + 1 })}
      open={open}
    >
      <Box sx={{ position: 'relative', display: 'inline-flex' }}>
        <CircularProgress variant="determinate" value={value} color="primary" />
        <Box
          sx={{
            top: 0,
            left: 0,
            bottom: 0,
            right: 0,
            position: 'absolute',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {value < 100 && (
            <Typography
              variant="caption"
              component="div"
              sx={{ color: 'white' }}
            >{`${Math.round(value)}%`}</Typography>
          )}
          {value >= 100 && <DoneIcon />}
        </Box>
      </Box>
    </Backdrop>
  )
}
