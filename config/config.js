const dotenv = require('dotenv');

dotenv.config();

const config = {
    production:{
        secret: process.env.secret,
        port: process.env.port
    },

    development:{
        secret: process.env.SECRET,
        port: process.env.port || 6000
    }
}

module.exports = env=> config[env] || config.development;