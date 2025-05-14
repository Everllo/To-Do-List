const express = require('express');
const router = express.Router();
const todoController = require('../controllers/todoController');

router.get('/todos', todoController.getTodosHandle);
router.post('/todos', todoController.addTodoHandle);
router.put('/todos/:id', todoController.updateTodoHandler);
router.delete('/todos/:id', todoController.deleteTodoHandler);

module.exports = router;