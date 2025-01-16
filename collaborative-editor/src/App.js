import React from 'react';
import Editor from './Editor';

const App = () => {
    const documentId = 'some-document-id'; // This would be dynamic in a real app
    const user = 'user1'; // This should be fetched based on authentication

    return (
        <div>
            <Editor documentId={documentId} user={user} />
        </div>
    );
};

export default App;
