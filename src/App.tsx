import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import Login from './pages/Login'
import Register from './pages/Register'
import Success from './pages/Success'
import ChatAssistant from './pages/ChatAssistant'

const theme = createTheme()

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/success" element={<Success />} />
          <Route path="/assistant" element={<ChatAssistant />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
