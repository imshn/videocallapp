const http = require("http");
const Socket = require("socket.io");
const cors = require("cors");

const httpServer = http.createServer();
const io = new Socket.Server(httpServer, {
  cors: {
    origin: "*"
  }
});

io.on("connection", (socket) => {
  console.log("New client connected");

  socket.on("joinRoom", (roomName) => {
    socket.join(roomName);
    console.log(`User joined room ${roomName}`);
  });

  socket.on("sendMessage", (message) => {
    console.log(`User sent message: ${message}`);
    io.to(socket.room).emit("receiveMessage", message);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});
httpServer.listen(3000, function(){
  console.log("Listening...")
});
