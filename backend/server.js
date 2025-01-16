const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

// MongoDB connection
const MONGO_URI = 'mongodb://127.0.0.1:27017/collaborative-editor';
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

// Define Mongoose schema and model
const DocumentSchema = new mongoose.Schema({
  _id: String, // Use a string ID for document identification
  content: { type: String, default: '' },
  cursors: { type: Object, default: {} },
});

const Document = mongoose.model('Document', DocumentSchema);

// Express setup
const app = express();
app.use(cors());
app.use(express.json());

// Start the server
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000', // Adjust to match your frontend URL
    methods: ['GET', 'POST'],
  },
});

// Handle socket.io connections
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('joinDocument', async (documentId) => {
    console.log(`User joined document: ${documentId}`);
    try {
      // Find or create the document
      let document = await Document.findById(documentId);
      if (!document) {
        document = new Document({ _id: documentId });
        await document.save();
      }

      // Send the document content to the connected user
      socket.join(documentId);
      socket.emit('documentData', document);

      // Broadcast updated user list to all users in the document
      const usersInRoom = Array.from(io.sockets.adapter.rooms.get(documentId) || []);
      const activeUsers = usersInRoom.map((id) => ({ id, name: `User ${id.substring(0, 5)}` }));
      io.to(documentId).emit('userJoined', activeUsers);
    } catch (error) {
      console.error('Error joining document:', error);
    }
  });

  socket.on('updateDocument', async ({ documentId, content, cursors }) => {
    try {
      // Update the document content and broadcast to all users
      const document = await Document.findByIdAndUpdate(
        documentId,
        { content, cursors },
        { new: true }
      );

      io.to(documentId).emit('documentUpdated', { content: document.content, cursors });
    } catch (error) {
      console.error('Error updating document:', error);
    }
  });

  socket.on('saveDocument', async (documentId) => {
    try {
      const document = await Document.findById(documentId);
      if (!document) {
        console.error(`Document ${documentId} not found for saving.`);
        return;
      }

      await document.save();
      console.log(`Document ${documentId} saved successfully.`);

      // Notify all users that the document was saved
      io.to(documentId).emit('documentSaved', { documentId, content: document.content });
    } catch (error) {
      console.error('Error saving document:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);
  });
});

// Start the server
const PORT = 4000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
