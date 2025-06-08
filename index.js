@@ -11,77 +11,166 @@ const dbConfig = {
    user: 'root',
    password: '',
    database: 'todolist',
  };
};

async function retrieveListItems() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const query = 'SELECT id, text FROM items';
        const [rows] = await connection.execute(query);
        await connection.end();
        return rows;
    } catch (error) {
        console.error('Error retrieving list items:', error);
        throw error;
    }
}

  async function retrieveListItems() {
async function addListItem(text) {
    try {
      // Create a connection to the database
      const connection = await mysql.createConnection(dbConfig);

      // Query to select all items from the database
      const query = 'SELECT id, text FROM items';

      // Execute the query
      const [rows] = await connection.execute(query);

      // Close the connection
      await connection.end();

      // Return the retrieved items as a JSON array
      return rows;
        const connection = await mysql.createConnection(dbConfig);
        const query = 'INSERT INTO items (text) VALUES (?)';
        await connection.execute(query, [text]);
        await connection.end();
    } catch (error) {
      console.error('Error retrieving list items:', error);
      throw error; // Re-throw the error
        console.error('Error adding list item:', error);
        throw error;
    }
  }
}

// Stub function for generating HTML rows
async function getHtmlRows() {
    // Example data - replace with actual DB data later
    /*
    const todoItems = [
        { id: 1, text: 'First todo item' },
        { id: 2, text: 'Second todo item' }
    ];*/
async function deleteListItem(id) {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const query = 'DELETE FROM items WHERE id = ?';
        await connection.execute(query, [id]);
        await connection.end();
    } catch (error) {
        console.error('Error deleting list item:', error);
        throw error;
    }
}

    const todoItems = await retrieveListItems();
async function updateListItem(id, newText) {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const query = 'UPDATE items SET text = ? WHERE id = ?';
        await connection.execute(query, [newText, id]);
        await connection.end();
    } catch (error) {
        console.error('Error updating list item:', error);
        throw error;
    }
}

// Helper function to escape HTML special characters to avoid XSS
function escapeHtml(text) {
    return text.replace(/[&<>"']/g, function(m) {
        return ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        })[m];
    });
}

    // Generate HTML for each item
async function getHtmlRows() {
    const todoItems = await retrieveListItems();
    return todoItems.map(item => `
        <tr>
            <td>${item.id}</td>
            <td>${item.text}</td>
            <td><button class="delete-btn">×</button></td>
            <td ondblclick="enableEdit(this, ${item.id})">${escapeHtml(item.text)}</td>
            <td><button onclick="deleteItem(${item.id})">×</button></td>
        </tr>
    `).join('');
}

// Modified request handler with template replacement
async function handleRequest(req, res) {
    if (req.url === '/') {
    if (req.url === '/' && req.method === 'GET') {
        try {
            const html = await fs.promises.readFile(
                path.join(__dirname, 'index.html'), 
                path.join(__dirname, 'index.html'),
                'utf8'
            );

            // Replace template placeholder with actual content
            const processedHtml = html.replace('{{rows}}', await getHtmlRows());

            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(processedHtml);
        } catch (err) {
            console.error(err);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Error loading index.html');
        }
    } else if (req.url === '/add' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
            try {
                const data = JSON.parse(body);
                if (!data.text || typeof data.text !== 'string' || !data.text.trim()) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: 'Invalid text' }));
                    return;
                }
                await addListItem(data.text.trim());
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch (err) {
                console.error(err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: 'Server error' }));
            }
        });
    } else if (req.url === '/delete' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
            try {
                const data = JSON.parse(body);
                const id = parseInt(data.id, 10);
                if (!id || isNaN(id)) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: 'Invalid id' }));
                    return;
                }
                await deleteListItem(id);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch (err) {
                console.error(err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: 'Server error' }));
            }
        });
    } else if (req.url === '/update' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
            try {
                const data = JSON.parse(body);
                const id = parseInt(data.id, 10);
                const newText = data.text && data.text.trim();

                if (!id || isNaN(id) || !newText) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, message: 'Invalid id or text' }));
                    return;
                }

                await updateListItem(id, newText);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch (err) {
                console.error(err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: 'Server error' }));
            }
        });
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Route not found');
    }
}

// Create and start server
const server = http.createServer(handleRequest);
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
Footer
© 2025 GitHub, Inc.
Footer navigation
Terms
Privacy
