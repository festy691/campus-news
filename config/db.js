const sequelize = require('sequelize');

let db = new sequelize('campus-news', 'root','root',{host: 'localhost', dialet: 'postgres'});

module.exports = db;