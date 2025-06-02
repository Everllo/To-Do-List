const http = require('http');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { URL } = require('url');  // пригодится, если захотим парсить GET-параметры (для редактирования позже)
const querystring = require('querystring');  // для разбора тела POST

const PORT = 3000;

// Database connection settings
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',       // <-- если у вас есть пароль, укажите его здесь
  database: 'todolist',
};

// Функция, чтобы получить все элементы из БД
async function retrieveListItems() {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const query = 'SELECT id, text FROM items';
    const [rows] = await connection.execute(query);
    await connection.end();
    return rows; // массив объектов вида { id: 1, text: '…' }
  } catch (error) {
    console.error('Error retrieving list items:', error);
    throw error;
  }
}

// Функция, которая генерирует HTML-строки <tr>…</tr> для всех записей
async function getHtmlRows() {
  const todoItems = await retrieveListItems();
  return todoItems
    .map(
      (item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${item.text}</td>
        <td>
          <!-- Кнопка удаления отправляет POST /delete с параметром id -->
          <form action="/delete" method="POST" style="display: inline;">
            <input type="hidden" name="id" value="${item.id}" />
            <button type="submit">Delete</button>
          </form>
          <!-- Ссылка редактирования ведёт на GET /edit?id=… -->
          <a href="/edit?id=${item.id}" style="margin-left: 8px;">Edit</a>
        </td>
      </tr>
    `
    )
    .join('');
}

// Обработчик запросов
async function handleRequest(req, res) {
  // 1) Роут «GET /» — отдать главную страницу с подстановкой {{rows}}
  if (req.url === '/' && req.method === 'GET') {
    try {
      const html = await fs.promises.readFile(path.join(__dirname, 'index.html'), 'utf8');
      const processedHtml = html.replace('{{rows}}', await getHtmlRows());
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(processedHtml);
    } catch (err) {
      console.error(err);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Error loading index.html');
    }
    return;
  }

  // 2) Роут «POST /add» — добавление нового элемента
  if (req.url === '/add' && req.method === 'POST') {
    let body = '';
    // Считываем тело запроса
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      // Разбираем то, что пришло из формы
      const parsed = querystring.parse(body);
      const newText = parsed.text && parsed.text.trim();
      if (newText) {
        try {
          const connection = await mysql.createConnection(dbConfig);
          await connection.execute('INSERT INTO items (text) VALUES (?)', [newText]);
          await connection.end();
        } catch (err) {
          console.error('Error inserting new item:', err);
          // Если ошибка, можно вернуть 500, но для простоты всё равно сделаем редирект
        }
      }
      // Редиректим обратно на «/», чтобы увидеть обновлённый список
      res.writeHead(302, { Location: '/' });
      res.end();
    });
    return;
  }

  // 3) Роут «POST /delete» — удаление элемента
  if (req.url === '/delete' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      const parsed = querystring.parse(body);
      const idToDelete = parsed.id;
      if (idToDelete) {
        try {
          const connection = await mysql.createConnection(dbConfig);
          await connection.execute('DELETE FROM items WHERE id = ?', [idToDelete]);
          await connection.end();
        } catch (err) {
          console.error('Error deleting item:', err);
        }
      }
      res.writeHead(302, { Location: '/' });
      res.end();
    });
    return;
  }

  // 4) Роут «GET /edit?id=…» — отдать форму редактирования конкретного элемента
  if (req.url.startsWith('/edit') && req.method === 'GET') {
    // Преобразуем URL в объект, чтобы достать GET-параметр ?id=...
    const urlObj = new URL(req.url, `http://${req.headers.host}`);
    const idToEdit = urlObj.searchParams.get('id');
    if (!idToEdit) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('Bad Request: id is missing');
      return;
    }
    try {
      const connection = await mysql.createConnection(dbConfig);
      const [rows] = await connection.execute('SELECT text FROM items WHERE id = ?', [idToEdit]);
      await connection.end();
      if (rows.length === 0) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Item not found');
        return;
      }
      const existingText = rows[0].text;
      // Отправляем минимальную HTML-страницу с формой редактирования
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Edit Item</title>
        </head>
        <body style="font-family: Arial, sans-serif; width: 70%; margin: 40px auto;">
          <h2>Edit To-Do Item</h2>
          <form action="/update" method="POST">
            <input type="hidden" name="id" value="${idToEdit}" />
            <div style="margin-bottom: 16px;">
              <label for="text">New Text:</label><br/>
              <input 
                type="text" 
                id="text" 
                name="text" 
                value="${existingText.replace(/"/g, '&quot;')}" 
                required 
                style="width: 100%; padding: 8px;"
              />
            </div>
            <button type="submit" style="padding: 8px 16px;">Save</button>
            <a href="/" style="margin-left: 16px;">Cancel</a>
          </form>
        </body>
        </html>
      `);
    } catch (err) {
      console.error('Error fetching item for edit:', err);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Server error');
    }
    return;
  }

  // 5) Роут «POST /update» — сохранить изменения после редактирования
  if (req.url === '/update' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      const parsed = querystring.parse(body);
      const idToUpdate = parsed.id;
      const newText = parsed.text && parsed.text.trim();
      if (idToUpdate && newText) {
        try {
          const connection = await mysql.createConnection(dbConfig);
          await connection.execute('UPDATE items SET text = ? WHERE id = ?', [newText, idToUpdate]);
          await connection.end();
        } catch (err) {
          console.error('Error updating item:', err);
        }
      }
      res.writeHead(302, { Location: '/' });
      res.end();
    });
    return;
  }

  // 6) Всё, что не попало ни под один из роутов, — 404
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Route not found');
}

// Запускаем HTTP-сервер
const server = http.createServer(handleRequest);
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
