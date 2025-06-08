@@ -5,83 +5,82 @@ const mysql = require('mysql2/promise');

const PORT = 3000;

// Database connection settings
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    password: 'pass',
    database: 'todolist',
  };
};


  async function retrieveListItems() {
async function retrieveListItems() {
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
        const query = 'SELECT id, text FROM items';
        const [rows] = await connection.execute(query);
        await connection.end();
        return rows;
    } catch (error) {
      console.error('Error retrieving list items:', error);
      throw error; // Re-throw the error
        console.error('Error retrieving list items:', error);
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

    const todoItems = await retrieveListItems();

    // Generate HTML for each item
    return todoItems.map(item => `
    return todoItems.map((item, index) => `
        <tr>
            <td>${item.id}</td>
            <td>${index + 1}</td>
            <td>${item.text}</td>
            <td><button class="delete-btn">×</button></td>
            <td>
                <form method="POST" action="/delete" style="display:inline;">
                    <input type="hidden" name="id" value="${item.id}" />
                    <button type="submit">Удалить</button>
                </form>
            </td>
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
    } else if (req.method === 'POST' && req.url === '/delete') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            const parsed = new URLSearchParams(body);
            const id = parsed.get('id');

            try {
                const connection = await mysql.createConnection(dbConfig);
                await connection.execute('DELETE FROM items WHERE id = ?', [id]);
                await connection.end();

                res.writeHead(302, { Location: '/' });
                res.end();
            } catch (err) {
                console.error('Error deleting item:', err);
                res.writeHead(500);
                res.end('Internal Server Error');
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
