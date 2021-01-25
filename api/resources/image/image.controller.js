const url = require("url");
const path = require("path");
const cloudinary = require('../../../config/cloudinary');
const fs = require('fs');

const {ImageModel, UserModel} = require("../../../config/db");

module.exports =  {
    async createImage(req,res){
        try {
            let model = new ImageModel();

            if (!req.file)
                return res.status(400).send({"error":"Image file is required"});

            model.image = await uploadImage(req.file);

            console.log(model.image);

            let result = await UserModel.create(model);
            if(!result) return res.status(400).send({"error":"Could not save image"});
            return res.status(400).send({"success":"Image Uploaded"});
        } catch (err) {
            return res.status(400).send({"error":err});
        }
    },

    async updateImage(req,res){
        try {

            let data = req.body;

            const image = await ImageModel.findOne({where:{_id:req.params.id}});

            if (!image) return res.status(404).send({"error":"Image not found"});

            if (!req.file) return res.status(404).send({"error":"Image file is required"});

            if (image.image){
                destroy(nameFromUri(image.image)).catch((result)=>{
                    console.log(result);
                });
            }

            image.image = await uploadImage(req.file);

            let result = await image.save({validateBeforeSave:false});
            if (result){
                return res.status(200).send(result);
            }
            return res.status(400).send({"error":"Could not update image"});
        } catch (err) {
            return res.status(400).send({"error":err});
        }
    },

    async getOneImage(req,res){
        try {
            let image = await ImageModel.findOne({where:{_id : req.params.id}});
            if(image){
                return res.status(200).send(image);
            }
            return res.status(404).send({"error":"Image not found"});
        } catch (err) {
            return res.status(400).send({"error":err});
        }
    },

    async getAllImages(req,res){
        try {
            let images = await ImageModel.findAll({});
            if(images){
                return res.status(200).send(images);
            }
            return res.status(400).send({"error":"No Image"});
        } catch (err) {
            return res.status(400).send({"error":err});
        }
    },

    async deleteImage(req,res){
        try {
            let image = await ImageModel.findOne({where:{id: req.params.id}});
            if (!image) return res.status(404).send({"error":"Image not found"});
            let result = await ImageModel.destroy({where:{id:req.params.id}});
            if (!result) return res.status(400).send({"error":"Image not deleted"});
            if (image.image) await destroy(nameFromUri(doc.image));
            return res.status(200).send({"success":"Image deleted"});
        } catch (err) {
            res.status(400).send({"error":err});
        }
    }
}

function nameFromUri(myurl){
    var parsed = url.parse(myurl);
    var image = path.basename(parsed.pathname);
    return "images/"+path.parse(image).name
}

async function destroy(file) {
    await cloudinary.delete(file);
}

async function uploadImage(file){
    const uploader = async (path) => await cloudinary.uploads(path, 'images');

    const { path } = file;
    const newPath = await uploader(path);
    //console.log(newPath);
    const imageUrl = await newPath.url;
    //url.push(newPath);
    fs.unlinkSync(path);

    return imageUrl;
}