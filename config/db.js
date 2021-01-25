const Sequelize = require('sequelize');
let UserModel = require('../api/resources/user/user.model')

let db = new Sequelize('campus-news', 'postgres', 'root', {
        host: 'localhost',
        dialect: 'postgres'
});

try {
    db.authenticate().then(()=>{
        console.log('Connection has been established successfully.');
    });
} catch (error) {
    console.error('Unable to connect to the database:', error);
}

let user = UserModel( db );

user.sync();

module.exports = {
    UserModel : user,
};