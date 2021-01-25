const {DataTypes} = require('sequelize')
module.exports = function( sequelize ) {

    /** Create the schema */
    var UserModel = sequelize.define('Users',
    {
        name: {
            type: DataTypes.STRING,
            require: {
                "error":"Name is required"
            },
            notNull: {
                "error":"Name cannot be null"
            },
        },
        email: {
            type: DataTypes.STRING,
            require: {
                "error":"Email is required"
            },
            unique: {
                "error":"Email already exist"
            },
            isEmail: {
                "error":"Invalid email format"
            },  
            notNull: {
                "error":"Email cannot be null"
            },
        },
        password: {
            type: DataTypes.STRING,
            require: {
                "error":"Password is required"
            },
            notNull: {
                "error":"Password cannot be null"
            },
        },
        phonenumber: {
            type: DataTypes.STRING,
            require: {
                "error":"Phone number is required"
            },
            notNull: {
                "error":"Phone number cannot be null"
            },
        },
        image : {
            type : DataTypes.STRING,
        },
        level: {
            type: DataTypes.STRING,
            defaultValue: 'user',
            isIn: [['user', 'admin']],
        },
        verified : {
            type : DataTypes.BOOLEAN,
            defaultValue : false
        },
        verificationCode : {
            type : DataTypes.STRING,
        },
        verificationExpire : {
            type : DataTypes.DATE
        },
        resetPasswordToken : {
            type : DataTypes.STRING
        },
        resetPassordExpire : {
            type : DataTypes.DATE
        },
    });

    return UserModel;

};