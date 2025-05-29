const http = require('http');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const PORT = 3000;

// Database connection settings
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'newpassword',  // Замените на свой новый пароль
    database: 'todolist'
};

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
        </tr>
    `).join('');
}

// Обработчик HTTP-запросов с поддержкой маршрутов для списка задач
async function handleRequest(req, res) {
    const { method, url } = req;  // Деструктурируем метод и URL из запроса

    if (method === 'GET' && url === '/') {
        // GET / - Главная страница: отправляем HTML со списком задач, вставленным в шаблон
        try {
            const html = await fs.promises.readFile(path.join(__dirname, 'index.html'), 'utf8');
            const processedHtml = html.replace('{{rows}}', await getHtmlRows());  // вставляем задачи в шаблон
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(processedHtml);  // отправляем сформированную HTML-страницу
        } catch (err) {
            console.error('Ошибка при загрузке главной страницы:', err);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Ошибка сервера при загрузке страницы');
        }
    } else if (method === 'POST' && url === '/add') {
        // POST /add - Добавление нового элемента: вызываем обработчик добавления
        handleAddItem(req, res);
    } else if (method === 'POST' && url.startsWith('/remove/')) {
        // POST /remove/:id - Удаление элемента: извлекаем id из URL и вызываем обработчик удаления
        const id = url.split('/')[2];          // например, из '/remove/42' получим id = '42'
        handleRemoveItem(req, res, id);        // передаём полученный id в функцию удаления
    } else {
        // Прочие маршруты - возвращаем 404, маршрут не найден
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Route not found');
    }
}


// Добавление нового элемента в список
async function handleAddItem(req, res) {
    if (req.method === 'POST' && req.url === '/add') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const { text } = JSON.parse(body);
                const connection = await mysql.createConnection(dbConfig);
                const query = 'INSERT INTO items (text) VALUES (?)';
                const [result] = await connection.execute(query, [text]);
                await connection.end();
                // Возвращаем ID добавленного элемента и сообщение об успехе
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    id: result.insertId, 
                    message: 'Item added successfully' 
                }));
            } catch (error) {
                console.error('Error adding item:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Error adding item' }));
            }
        });
    }
}
// Удаление элемента из списка
async function handleRemoveItem(req, res) {
    if (req.method === 'POST' && req.url.startsWith('/remove')) {
        const id = req.url.split('/')[2];  // Извлекаем ID из URL, например /remove/5
        try {
            const connection = await mysql.createConnection(dbConfig);
            const query = 'DELETE FROM items WHERE id = ?';
            await connection.execute(query, [id]);
            await connection.end();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Item deleted successfully' }));
        } catch (error) {
            console.error('Error removing item:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Error removing item' }));
        }
    }
}

// Create and start server
const server = http.createServer(handleRequest);
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
