/**
 * Created by glitch on 27/11/17.
 */

var mongoose = require('mongoose');
var connection = mongoose.connect('mongodb://localhost:27017/concrete');//connecting to our database named concrete
var bcrypt = require('bcrypt');
//creating the USER Schema
var OrderSchema = mongoose.Schema({
    date:{
        type:String,
        required:true
    },
    quantity:{
        type:String,
        required:true
    },
    quality:{
        type:String,
        required:true
    },
    requestedBy:{
        type:String,
        required:true
    },
    requestedById:{
        type:mongoose.Schema.Types.ObjectId,
        required:true
    },
    companyName:{
            type:String
    },
    cancelled:{
        type:Boolean,
        default:false
    },
    reason:{
        type:String
    }
});


var Order = module.exports = mongoose.model('Order', OrderSchema);

module.exports.getAllOrderdByUserId = function(id, callback){
    Orders.find({requestedById:id}, {} , callback);
}

module.exports.addOrder = function(newOrder, callback){
    newOrder.save(newOrder, callback);
}

module.exports.cancelOrder = function(orderId, reason, callback){
    Order.findOne({_id:orderId}, function(err, order){
        if(err)throw err;
        order.cancelled = true;
        order.reason = reason;
        order.save(function(err){
            callback(err, order);
        });
    })
}