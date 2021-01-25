const url = require("url");
const path = require("path");
//const cloudinary = require('./cloudinary');
const fs = require('fs');
const bcriptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require("nodemailer");
const crypto = require('crypto');
const { Op } = require('sequelize')

const {UserModel} = require('../../../config/db');

module.exports = {
    async createUser(req,res){
        try {
            let data = req.body;

            if(data.password.length < 6) return res.status(400).send({"error":'Password length is too short'});
            
            if (!data.name) return res.status(400).send({"error":'Name is required'});

            if (!data.email) return res.status(400).send({"error":'Email is required'});

            if (!data.phonenumber) return res.status(400).send({"error":'Phone Number is required'});

            if (!data.password) return res.status(400).send({"error":'Password is required'});

            let existingUser = await UserModel.findOne({where: {email: data.email.toLowerCase()}});

            if (existingUser) return res.status(400).send({"error":'Email already exist'});

            const name = data.name;
            const email = data.email.toLowerCase();
            const phonenumber = data.phonenumber;
            const password = data.password;
            const verificationId = makeid(6);

            let user = {
                name : name,
                email : email,
                phonenumber : phonenumber,
                verificationExpire : Date.now() + 10 * 60 * 1000,
                verificationCode : verificationId,
            };

            //HASHING THE password with bcryptjs
            const salt = await bcriptjs.genSalt(10);
            const hashedPassword = await bcriptjs.hash(password,salt);
            user.password = hashedPassword;

            await UserModel.create(user);
                
            const message = `<H2>${process.env.EMAIL_FROM}</H2>
            <br><h3>Dear ${name}</h3><br>
            <br>You have requested to create a new account, we verify emails to prevent spamming our server
            <br><br><center>Your activation code is <b><h2>${verificationId}</h2></b></center>`;

            try {
                await emailPassword({
                    email: email,
                    subject: 'Create Account',
                    message
                });

                return res.status(201).send({"success":"A verification mail has been sent to you via the provided email"});
            } catch (error) {
                return res.status(400).send({"error":error});
            }
        } catch (err) {
            return res.status(400).send({"error":err});
        }
    },
    
    async updateUser(req,res){
        try {
            let data = req.body;
            let existingUser = await UserModel.findOne({where: {id: req.params.id}});

            if (!existingUser) return res.status(404).send({"error":'User not found'});

            if (!data.name && !data.phonenumber) return res.status(400).send({"error":'Nothing to update'});

            const name = data.name;
            const phonenumber = data.phonenumber;
            let user = {};

            if (name) user.name = name;
            if (phonenumber) user.phonenumber = phonenumber;

            
            try {
                await UserModel.update(user, {
                    where: {
                      id: req.params.id
                    }
                });
                return res.status(201).send({"success":"User updated"});
            } catch (error) {
                return res.status(400).send({"error":error});
            }
        } catch (err) {
            return res.status(400).send({"error":err});
        }
    },
    
    async updatePic(req,res){
        try {
            let data = req.body;
            let existingUser = await UserModel.findOne({where: {id: req.params.id}});

            if (!existingUser) return res.status(404).send({"error":'User not found'});

            if (!data.image) return res.status(400).send({"error":'Emage cannot be null'});

            const image = data.image;
            let user = {};

            if (image) existingUser.image = image;

            try {
                await existingUser.save({validateBeforeSave:false});
                return res.status(201).send({"success":"Profile picture updated"});
            } catch (error) {
                return res.status(400).send({"error":error});
            }
        } catch (err) {
            return res.status(400).send({"error":err});
        }
    },
    
    async getSingleUser(req,res){
        try {
            let user = await UserModel.findOne({where: {id: req.params.id},attributes: { exclude: ['password','verificationCode','verificationExpire','resetPasswordToken','resetPassordExpire'] }});
            if(user) return res.status(200).send(user);
            return res.status(404).send({"error":"User not found"});
        } catch (err) {
            res.status(400).send({"error":err});
        }
    },
    
    async getAllUsers(req,res){
        try {
            let {page, perPage} = req.query;
            page = parseInt(page,10) || 0;
            perPage = parseInt(perPage,10) || 10;
            page = 0 + (page - 1) * perPage;
            if(page < 0) page = 0;
            let users = await UserModel.findAndCountAll(
                {attributes: 
                    { exclude: ['password','verificationCode','verificationExpire','resetPasswordToken','resetPassordExpire'] 
                },
                limit: perPage,
                offset: page,
                order: [ ['createdAt',  'DESC'] ],
            });
            if(users) {
                users.page = page + 1;
                users.limit = perPage;
                return res.status(200).send(users);
            }
            return res.status(404).send({"error":"User not found"});
        } catch (err) {
            return res.status(400).send({"error":err});
        }
    },
    
    async deleteUser(req,res){
        try {
            let user = await UserModel.findOne({where: {id: req.params.id},attributes: { exclude: ['password','verificationCode','verificationExpire','resetPasswordToken','resetPassordExpire'] }});
            if(!user) return res.status(404).send({"error":"User not found"});
            let deleteUser = await User.destroy({
                where: {
                  id: req.params.id
                }
            });
            if(!deleteUser) return res.status(400).send({"error":"Failed to delete user"});
            return res.status(200).send({"success":"User deleted"});
        } catch (err) {
            return res.status(400).send({"error":err});
        }
    },
    
    async loginUser(req,res){
        try {
            var data = req.body;

            let user = await UserModel.findOne({where: {email: data.email}});
            if(!user) return res.status(404).send({"error":"Email or Password incorrect"});

            const email = data.email.toLowerCase();
            if(!email || !data.password) return res.status(400).send({"error":"Email and Password is required"});

            const password = await bcriptjs.compare(data.password,user.password);

            if (!password) return res.status(404).send({"error":"Email or Password incorrect"});

            if(!user.verified) return res.status(400).send({"error":'Your Account has not been verified, verify to login'});

            // res.header('auth-token', token).send(token);
            sendTokenResponse(user,201,res);

        } catch (err) {
            return res.status(400).send({"error":err});
        }
    },
    
    async updatePassword(req,res){
        try {
            var data = req.body;
            const id = req.params.id;
            if(!data.newPassword || !data.oldPassword)
            return res.status(400).send('Email and password is required');

            let doc = await UserModel.findOne({where:{id:id}});

            if (!doc) return res.status(404).send({"error":"User not found"});

            const password = await bcriptjs.compare(data.oldPassword,doc.password);

            if (!password) return res.status(400).send({"error":`The old password is incorrect`});

            const salt = await bcriptjs.genSalt(10);
            const hashedPassword = await bcriptjs.hash(data.newPassword,salt);
            doc.password = hashedPassword;
            let update = await doc.save({});
            if (update){
                return res.status(200).send({"success":"Password updated"});
            }
            return res.status(400).send({"error":'Error updating Password'});
        } catch (err) {
            return res.status(400).send({'error':err});
        }
    },
    
    async logoutUser(req,res,next){
        res.cookie('token', 'none', {
            expiresIn: new Date(Date.now() + 10 * 1000),
            httpOnly: true
        });
    
        return res.status(200).send({"error":"Logout Success"});
    },
    
    async forgotPassword(req,res){
        
        try {
            const user = await UserModel.findOne({where:{email:req.body.email.toLowerCase()}});

            if(!user){
                return res.status(404).send({"error":'User not found'});
            }

            const resetToken = makeid(6);

            const name = user.name;
            user.resetPasswordToken = resetToken;
            user.resetPassordExpire = Date.now() + 10 * 60 * 1000;

            user.save({validateBeforeSave: false});
             
            const message = `<H2>${process.env.EMAIL_FROM}</H2>
                            <br><h3>Dear ${name}</h3><br>
                            <br>You have requested to reset your password, we verify emails to prevent spamming our server. If you did not request this please igore this message.
                            <br><br><center>Your reset code is <b><h2>${resetToken}</h2></b></center>`;

             try {
                 await emailPassword({
                     email: user.email,
                     subject: 'Password Reset',
                     message
                 });

                 return res.status(200).send("Email sent");
             } catch (error) {
                 user.resetPasswordToken = undefined;
                 user.resetPassordExpire = undefined;

                 user.save({validateBeforeSave: false});

                 return res.status(400).send({"error":error});
             }

        } catch (err) {
            res.status(400).send({"error":err});
        }
    },
    
    async makeAdmin(req,res,next){
        try {
            const user = await UserModel.findOne({where:{id:req.user.id}});
            if(!user) return res.status(401).send({"error":"Unauthorized"});
            if(user.level === 'admin'){
                let authUser = await UserModel.findOne({where:{id:req.params.id}});
                if(!authUser) return res.status(404).send({"error":"User not found"});
                authUser.level = req.body.level;
                let result = await authUser.save({validateBeforeSave: false});

                if(!result) return res.status(400).send({"error":'Could not update user access'});
                return res.status(201).send({"success":"User access updated"});
            }
            return res.status(200).send(user);
        } catch (error) {
            return res.status(400).send({"error":error});
        }
    },
    
    async getMe(req,res,next){
        try {
            const user = await UserModel.findOne({where:{id:req.user.id}});
            return res.status(200).send(user);
        } catch (error) {
            return res.status(400).send({"error":error});
        }
    },
    
    async getVerificationMail(req,res){
        try {
            let data = req.body;
            let user = await UserModel.findOne({where: {email: data.email}});

            if(!user) return res.status(404).send({"error":'No account exist with provided email'});

            const name = user.name;
            const verificationId = makeid(6);
            user.verificationCode = verificationId;
            user.verificationExpire = Date.now() + 60 * 60 * 1000;
            
            await user.save({validateBeforeSave: false});

            const message = `<H2>${process.env.EMAIL_FROM}</H2>
                            <br><h3>Dear ${name}</h3><br>
                            <br>You have requested to create a new account, we verify emails to prevent spamming our server
                            <br><br><center>Your activation code is <b><h2>${verificationId}</h2></b></center>`;

            try {
                await emailPassword({
                    email: req.body.email,
                    subject: 'Verify Email',
                    message
                });

                return res.status(200).send({"success":"A verification mail has been sent to you via the provided email"});
            } catch (error) {
                return res.status(400).send({"error":error});
            }
        } catch (error) {
            return res.status(400).send({"error":error});
        }
    },
    
    async resetPassword(req,res){
        try {
            const user = await UserModel.findOne({where:{email:req.body.email,resetPasswordToken:req.body.resetPasswordToken,resetPassordExpire:{[Op.gte] : Date.now()}}});
               
            if (!user){
                return res.status(400).send({"error":'Expired or Invaild link'});
            }
    
            //HASHING THE password with bcryptjs
            const salt = await bcriptjs.genSalt(10);
            const hashedPassword = await bcriptjs.hash('default123',salt);
    
            user.password = hashedPassword;
            user.resetPasswordToken = undefined;
            user.resetPassordExpire = undefined;
            
            let update = await user.save({validateBeforeSave: false});
            if (update){
                return res.status(200).send({"success":"Password reset complete, login with default123 and change your password"});
            }
            return res.status(400).send({"error":'Error reseting Password'});
        } catch (error) {
            return res.status(400).send({"error":error});
        }
    },

    async verifyUserToken(req,res){
        try {
            const user = await UserModel.findOne({where:{email:req.body.email,verificationCode:req.body.verificationCode,verificationExpire:{[Op.gte] : Date.now()}}});
            console.log('did not work');
            if (!user) {
                return res.status(404).send({"error":`Invalid or expired activation token`});
            }
            
            user.verified = true;
            
            console.log(user);
            await user.save({validateBeforeSave: false});
            
            sendTokenResponse(user,201,res);
            
        } catch (err) {
            return res.status(400).send({'error':err});
        }
    },
    
}

// function nameFromUri(myurl){
//     var parsed = url.parse(myurl);
//     var image = path.basename(parsed.pathname);
//     return "users/"+path.parse(image).name
// }

// async function destroy(file) {
//     await cloudinary.delete(file);
// }

// async function uploadImage(file){
//     try {
//         const uploader = async (path) => await cloudinary.uploads(path, 'users');

//         // if(process.env.NODE_ENV === 'development'){
//         //     const { path } = file;
//         //     return __dirname+'/'+path;
//         // }

//         const { path } = file;
//         const newPath = await uploader(path);
//         //console.log(newPath);
//         const imageUrl = await newPath.url;
//         //url.push(newPath);
//         fs.unlinkSync(path);

//         return imageUrl;
//     } catch (error) {
//         console.log(error);
//         return false;
//     }
// }

const sendTokenResponse = (user,status,res)=>{
    const token = getSignedJwtToken(user);
    const options = {
        expires: new Date(Date.now() * 30 * 60 * 60 * 24 * 1000),
        httpOnly: true
    };

    if(process.env.NODE_ENV === 'production'){
        options.secure = true;
    }

    return res.status(status).cookie('token',token,options).send({token});
};

const emailPassword = async (options) => {
    let transporter = nodemailer.createTransport({
        host: `${process.env.EMAIL_HOST}`,
        port: `${process.env.EMAIL_PORT}`,
        secure: true, // true for 465, false for other ports
        auth: {
        user: `${process.env.EMAIL_USER}`, // generated ethereal user
        pass: `${process.env.EMAIL_PASSWORD}`, // generated ethereal password
        },
        tls:{
            rejectUnauthorized :false
        }
    });
    
    // send mail with defined transport object
    const message = {
        from: `${process.env.EMAIL_FROM} <${process.env.EMAIL_USER}>`, // sender address
        to: options.email, // list of receivers
        subject: options.subject, // Subject line
        html: options.message
        
        //${token}
    };

    const info = await transporter.sendMail(message);

    console.log("Message sent: %s", info.messageId);

};

function makeid(length) {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
       result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

let getSignedJwtToken = function (user) {
    return jwt.sign({_id:user.id}, process.env.JWT_ACC_ACTIVATE,{
        expiresIn:'30d'
    })
};

let getResetPasswordToken = function () {
    
    const resetToken = crypto.randomBytes(20).toString('hex');

    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.resetPasswordExpire = Date.now() + 10 * 60 * 60 * 1000;

    return resetToken;
};
