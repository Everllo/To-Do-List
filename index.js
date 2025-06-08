const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const app = express();
const port = 3000;

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'root', 
    database: 'todolist',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Получение всех задач
app.get('/items', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM items');
        res.json(rows);
    } catch (err) {
        console.error('Ошибка получения элементов:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Добавление задачи
app.post('/items', async (req, res) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Текст обязателен' });
    try {
        const [result] = await pool.query('INSERT INTO items (text) VALUES (?)', [text]);
        res.status(201).json({ success: true, id: result.insertId });
    } catch (err) {
        console.error('Ошибка добавления элемента:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Удаление задачи
app.delete('/items/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await pool.query('DELETE FROM items WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Элемент не найден' });
        }
        res.status(200).json({ success: true });
    } catch (err) {
        console.error('Ошибка удаления элемента:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.listen(port, () => {
    console.log(`Сервер запущен на http://localhost:${port}`);
});