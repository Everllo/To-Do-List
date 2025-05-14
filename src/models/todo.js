const { DataTypes } = require('sequelize');
const sequelize = require('../db/db');

const Todo = sequelize.define('todos_data', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    text: {
        type: DataTypes.STRING,
        allowNull: false,
    },
});

module.exports = Todo;