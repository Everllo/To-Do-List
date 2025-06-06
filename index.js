// ... 

async function deleteItem(id) {
  const connection = await mysql.createConnection(dbConfig);
  await connection.execute('DELETE FROM items WHERE id = ?', [id]);
  await connection.end();
}

async function handleRequest(req, res) {
  // ... (другие обработчики)
  
  else if (req.url.startsWith('/api/items/') && req.method === 'DELETE') {
    const id = req.url.split('/')[3];
    try {
      await deleteItem(id);
      res.writeHead(204);
      res.end();
    } catch (error) {
      console.error(error);
      res.writeHead(500);
      res.end('Error deleting item');
    }
  }
}
