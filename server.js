const express = require('express');
const path = require('path');
const app = express();
const hbs = require('hbs');
const apiRouter = require('./src/routers/api');
const webRouter = require('./src/routers/web');
const sequelize = require('./src/db/db');

app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'public/html'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', apiRouter);
app.use('/', webRouter);

app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).send('Internal Server Error');
});

const start = async () => {
    try {
        await sequelize.authenticate();
        console.log('Connection established');

        await sequelize.sync({ force: false });
        console.log('Database synced');

        app.listen(3000, () => console.log('Server started on port 3000'));
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

start();