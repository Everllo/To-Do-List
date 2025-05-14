const todoService = require('../services/todoService');

const todoController = {
    renderHome: async (req, res) => {
        try {
            const todos = await todoService.getTodos();
            res.render('index', { todos });
        } catch (err) {
            console.error(err);
            res.status(500).send('Internal Server Error');
        }
    },

    getTodosHandle: async (req, res) => {
        try {
            const todos = await todoService.getTodos();
            res.status(200).json(todos);
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    },

    addTodoHandle: async (req, res) => {
        try {
            const { text } = req.body;
            if (!text) {
                return res.status(400).json({ error: 'Text is required' });
            }
            await todoService.addTodo(text);
            res.status(201).json({ message: 'Todo added' });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    },

    updateTodoHandler: async (req, res) => {
        try {
            const { id } = req.params;
            const { text } = req.body;
            if (!text) {
                return res.status(400).json({ error: 'Text is required' });
            }
            const updated = await todoService.updateTodo(id, text);
            if (!updated) {
                return res.status(404).json({ error: 'Todo not found' });
            }
            res.status(200).json({ message: 'Todo updated' });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    },

    deleteTodoHandler: async (req, res) => {
        try {
            const { id } = req.params;
            const deleted = await todoService.deleteTodo(id);
            if (!deleted) {
                return res.status(404).json({ error: 'Todo not found' });
            }
            res.status(200).json({ message: 'Todo deleted' });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
};

module.exports = todoController;