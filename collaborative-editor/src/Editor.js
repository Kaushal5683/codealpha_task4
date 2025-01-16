import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const socket = io('http://localhost:4000'); // Backend server URL

const Editor = ({ documentId }) => {
  const [documentContent, setDocumentContent] = useState('');
  const [cursors, setCursors] = useState({});
  const [userName, setUserName] = useState('');
  const [activeUsers, setActiveUsers] = useState([]);

  // Handle user name input (for user presence tracking)
  useEffect(() => {
    setUserName(`User ${socket.id.substring(0, 5)}`); // Set a unique name based on socket id
  }, []);

  // Join the document when component is mounted
  useEffect(() => {
    if (documentId) {
      socket.emit('joinDocument', documentId); // Join the document by ID
    }

    socket.on('documentData', (document) => {
      setDocumentContent(document.content);
      setCursors(document.cursors);
    });

    socket.on('documentUpdated', ({ content, cursors }) => {
      setDocumentContent(content);
      setCursors(cursors);
    });

    socket.on('userJoined', (users) => {
      setActiveUsers(users);
    });

    socket.on('documentSaved', ({ documentId, content }) => {
      alert(`Document ${documentId} saved successfully.`);
      setDocumentContent(content); // Update content on save notification
    });

    return () => {
      socket.off('documentData');
      socket.off('documentUpdated');
      socket.off('userJoined');
      socket.off('documentSaved');
    };
  }, [documentId]);

  // Handle typing and update document content in real-time
  const handleTyping = (event) => {
    const newContent = event.target.value;
    setDocumentContent(newContent);
    
    // Emit content and cursor update to all users
    socket.emit('updateDocument', {
      documentId,
      content: newContent,
      cursors,
    });
  };

  // Handle cursor movement and synchronization
  const handleCursorMove = (event) => {
    const cursorPosition = event.target.selectionStart; // Get the current cursor position
    setCursors((prevCursors) => ({
      ...prevCursors,
      [userName]: cursorPosition, // Update current user's cursor position
    }));

    // Emit cursor position update to all users
    socket.emit('updateDocument', {
      documentId,
      content: documentContent,
      cursors: { ...cursors, [userName]: cursorPosition },
    });
  };

  // Handle saving the document
  const handleSave = () => {
    socket.emit('saveDocument', documentId); // Emit save document event
  };

  // Handle when the user leaves
  const handleLeave = () => {
    // Handle leaving document or cleanup if needed
  };

  return (
    <div className="editor">
      <div className="user-list">
        <h3>Active Users:</h3>
        <ul>
          {activeUsers.map((user) => (
            <li key={user.id}>{user.name}</li>
          ))}
        </ul>
      </div>

      <textarea
        value={documentContent}
        onChange={handleTyping}
        onSelect={handleCursorMove} // Sync cursor position
        onBlur={handleCursorMove} // When focus is lost, update cursor
        placeholder="Start typing here..."
      />
      
      <button onClick={handleSave}>Save Document</button>
      <button onClick={handleLeave}>Leave Document</button>
    </div>
  );
};

export default Editor;
