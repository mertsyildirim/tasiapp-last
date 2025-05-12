import { Server } from 'socket.io'

const ioHandler = (req, res) => {
  if (!res.socket.server.io) {
    const io = new Server(res.socket.server, {
      path: '/api/socketio',
      addTrailingSlash: false,
    })
    
    // Kullanıcı durumu değişikliğini dinle
    io.on('connection', (socket) => {
      console.log('Yeni bağlantı:', socket.id)
      
      // Kullanıcı durumu değişikliğini yayınla
      socket.on('userStatusChange', (data) => {
        // Tüm bağlı istemcilere durum değişikliğini bildir
        io.emit('userStatusChange', data)
      })
      
      // Bağlantı koptuğunda
      socket.on('disconnect', () => {
        console.log('Bağlantı koptu:', socket.id)
      })
    })
    
    res.socket.server.io = io
  }
  
  res.end()
}

export const config = {
  api: {
    bodyParser: false,
  },
}

export default ioHandler 