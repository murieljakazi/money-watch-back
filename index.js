const express = require('express');
const cors = require('cors');
const { SERVER_PORT } = require('./env');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


const server = app.listen(SERVER_PORT, () => {
    console.log(`Server is listening on : ${SERVER_PORT}`);
  });

module.exports = server;