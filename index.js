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

// Получить все задачи
app.get('/items', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM items');
        res.json(rows);
    } catch (err) {
        console.error('Ошибка получения задач:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Добавить задачу
app.post('/items', async (req, res) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Текст обязателен' });
    try {
        await pool.query('INSERT INTO items (text) VALUES (?)', [text]);
        res.status(201).json({ success: true });
    } catch (err) {
        console.error('Ошибка добавления задачи:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Удалить задачу
app.delete('/items/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM items WHERE id = ?', [id]);
        res.status(200).json({ success: true });
    } catch (err) {
        console.error('Ошибка удаления задачи:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Обновить задачу
app.put('/items/:id', async (req, res) => {
    const { id } = req.params;
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'Текст обязателен' });
    try {
        const [result] = await pool.query('UPDATE items SET text = ? WHERE id = ?', [text, id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Элемент не найден' });
        }
        res.status(200).json({ success: true });
    } catch (err) {
        console.error('Ошибка обновления задачи:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.listen(port, () => {
    console.log(`Сервер запущен на http://localhost:${port}`);
});