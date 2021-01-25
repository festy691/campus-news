const express = require('express');
const userRouter  = require('./resources/user');
const authRouter  = require('./resources/auth');

const restRouter = express.Router();

module.exports =  restRouter;

restRouter.use('/users', userRouter);
restRouter.use('/authenticate', authRouter);