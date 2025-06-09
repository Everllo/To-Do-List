@@ -5,83 +5,81 @@ const mysql = require('mysql2/promise');

const PORT = 3000;

// Database connection settings
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'todolist',
  };
};

// Получение всех задач из БД
async function retrieveListItems() {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute('SELECT id, text FROM items');
    await connection.end();
    return rows;
}

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
    } catch (error) {
      console.error('Error retrieving list items:', error);
      throw error; // Re-throw the error
    }
  }

// Stub function for generating HTML rows
// Генерация HTML-строк
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
        <tr>
            <td>${item.id}</td>
            <td>${item.text}</td>
            <td><button class="delete-btn">×</button></td>
            <td><button onclick="deleteItem(${item.id})">×</button></td>
        </tr>
    `).join('');
}

// Modified request handler with template replacement
// Обработчик запросов
async function handleRequest(req, res) {
    if (req.url === '/') {
    if (req.method === 'GET' && req.url === '/') {
        try {
            const html = await fs.promises.readFile(
                path.join(__dirname, 'index.html'), 
                'utf8'
            );

            // Replace template placeholder with actual content
            const html = await fs.promises.readFile(path.join(__dirname, 'index.html'), 'utf8');
            const processedHtml = html.replace('{{rows}}', await getHtmlRows());

            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(processedHtml);
        } catch (err) {
            console.error(err);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Error loading index.html');
            console.error('Ошибка при загрузке HTML:', err);
            res.writeHead(500);
            res.end('Ошибка сервера');
        }
    } else {
    }

    // Удаление задачи
    else if (req.method === 'POST' && req.url === '/delete') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const { id } = JSON.parse(body);
                if (!id) {
                    res.writeHead(400);
                    return res.end('ID is required');
                }

                const connection = await mysql.createConnection(dbConfig);
                await connection.execute('DELETE FROM items WHERE id = ?', [id]);
                await connection.end();

                res.writeHead(200);
                res.end('Deleted');
            } catch (err) {
                console.error('Ошибка при удалении:', err);
                res.writeHead(500);
                res.end('Ошибка сервера');
            }
        });
    }

    else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Route not found');
        res.end('Not Found');
    }
}

// Create and start server
const server = http.createServer(handleRequest);
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
server.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});
