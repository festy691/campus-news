const express = require('express');
const { protect, authorize } = require('./auth');
const userController = require('./user.controller');

const userRouter = express.Router();
module.exports = userRouter;

//const adminPolicy = [passport.authenticate('jwt',{session:false}), isAdmin];
//const userPolicy = passport.authenticate('jwt',{session:false});

userRouter.route('/')
.post(userController.createUser)
.get(protect, authorize('admin'), userController.getAllUsers);

userRouter.route('/:id')
.put(protect, userController.updateUser)
.get(protect, userController.getSingleUser);

userRouter.route('/login')
.post(userController.loginUser);

userRouter.route('/logout').post(protect,userController.logoutUser);

userRouter.route('/updatepassword/:id').put(protect,userController.updatePassword);

userRouter.route('/makeadmin/:id').put(protect, authorize('admin'),userController.makeAdmin);

userRouter.route('/verifyemail').post(userController.getVerificationMail);

userRouter.route('/forgotpassword').post(userController.forgotPassword);

userRouter.route('/resetpassword').post(userController.resetPassword);

userRouter.route('/me').get(protect,userController.getMe);

userRouter.route('/activate').post(userController.verifyUserToken);