// ... (общие настройки как выше)

async function updateItem(id, text) {
  const connection = await mysql.createConnection(dbConfig);
  await connection.execute(
    'UPDATE items SET text = ? WHERE id = ?',
    [text, id]
  );
  await connection.end();
}

async function handleRequest(req, res) {
  // ... (другие обработчики)
  
  else if (req.url.startsWith('/api/items/') && req.method === 'PUT') {
    const id = req.url.split('/')[3];
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', async () => {
      try {
        const { text } = JSON.parse(body);
        await updateItem(id, text);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ id, text }));
      } catch (error) {
        console.error(error);
        res.writeHead(500);
        res.end('Error updating item');
      }
    });
  }
}
