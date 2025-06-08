@@ -11,77 +11,83 @@ const dbConfig = {
    user: 'root',
    password: '',
    database: 'todolist',
  };
};


  async function retrieveListItems() {
// Получение всех задач из БД
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
        const [rows] = await connection.execute('SELECT id, text FROM items');
        await connection.end();
        return rows;
    } catch (error) {
      console.error('Error retrieving list items:', error);
      throw error; // Re-throw the error
        console.error('Ошибка при получении задач:', error);
        throw error;
    }
  }
}

// Stub function for generating HTML rows
// Генерация строк таблицы в HTML
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
            <td><button onclick="alert('Удаление недоступно в этой ветке')">×</button></td>
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
            res.end('Ошибка загрузки HTML');
        }
    } else {
    }

    // === [Добавление новой задачи] ===
    else if (req.method === 'POST' && req.url === '/add') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const { text } = JSON.parse(body);
                if (!text || text.trim() === '') {
                    res.writeHead(400);
                    return res.end('Text is required');
                }

                const connection = await mysql.createConnection(dbConfig);
                await connection.execute('INSERT INTO items (text) VALUES (?)', [text]);
                await connection.end();

                res.writeHead(200);
                res.end('OK');
            } catch (err) {
                console.error('Ошибка при добавлении:', err);
                res.writeHead(500);
                res.end('Ошибка сервера');
            }
        });
    }

    // === [Неизвестный путь] ===
    else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Route not found');
        res.end('Not Found');
    }
}

// Create and start server
// Запуск сервера
const server = http.createServer(handleRequest);
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
server.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
});
