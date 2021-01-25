const {DataTypes} = require('sequelize')
module.exports = function( sequelize ) {

    /** Create the schema */
    var ImageModel = sequelize.define('Images',
    {
        image: {
            type: DataTypes.STRING,
            require: {
                "error":"Image is required"
            },
            notNull: {
                "error":"Name cannot be null"
            },
        },
    });

    return ImageModel;

};